import express from 'express'
import cors from 'cors'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Serve built React app
app.use(express.static('dist'))

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

// GET /api/activity
app.get('/api/activity', async (req, res) => {
  try {
    const { from, to, type, job_id, limit = 1000, offset = 0 } = req.query

    let query = 'SELECT * FROM activity_log WHERE 1=1'
    const params = []
    let paramCount = 1

    if (from) {
      query += ` AND occurred_at >= $${paramCount}`
      params.push(new Date(from).toISOString())
      paramCount++
    }

    if (to) {
      query += ` AND occurred_at <= $${paramCount}`
      params.push(to.includes('T') ? to : `${to}T23:59:59.999Z`)
      paramCount++
    }

    if (type) {
      query += ` AND type = $${paramCount}`
      params.push(type)
      paramCount++
    }

    if (job_id) {
      query += ` AND job_id = $${paramCount}`
      params.push(parseInt(job_id))
      paramCount++
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM (${query}) as t`,
      params
    )
    const total = parseInt(countResult.rows[0].total)

    // Get paginated results
    query += ` ORDER BY occurred_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`
    params.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, params)

    res.json({
      data: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  } catch (err) {
    console.error('Database error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/activity (for HVAC tracker to log activities)
app.post('/api/activity', async (req, res) => {
  try {
    const { type, job_id, job_number, customer_name, old_stage, new_stage, created_by, modified_by, dispatcher_name, tech_name, employee_id } = req.body

    const result = await pool.query(
      `INSERT INTO activity_log (type, job_id, job_number, customer_name, old_stage, new_stage, created_by, modified_by, dispatcher_name, tech_name, employee_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [type, job_id, job_number, customer_name, old_stage, new_stage, created_by, modified_by, dispatcher_name, tech_name, employee_id]
    )

    res.status(201).json({ data: result.rows[0] })
  } catch (err) {
    console.error('Database error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/scorecard - Employee performance scorecard with job creation and dispatch data
app.get('/api/scorecard', async (req, res) => {
  try {
    const { from, to } = req.query

    // Get jobs created in date range
    let query = 'SELECT id, job_id, job_number, customer_name, created_by, occurred_at FROM activity_log WHERE type = $1'
    const params = [req.query.type || 'creation']
    let paramCount = 2

    if (from) {
      query += ` AND occurred_at >= $${paramCount}`
      params.push(new Date(from).toISOString())
      paramCount++
    }

    if (to) {
      query += ` AND occurred_at <= $${paramCount}`
      params.push(to.includes('T') ? to : `${to}T23:59:59.999Z`)
      paramCount++
    }

    query += ' ORDER BY occurred_at DESC'

    const jobsResult = await pool.query(query, params)
    const jobs = jobsResult.rows

    const jobsCreatedByEmployee = {}
    const dispatchesByEmployee = {}
    const recentBookings = []

    // Count jobs created per employee
    jobs.forEach(job => {
      if (job.created_by) {
        jobsCreatedByEmployee[job.created_by] = (jobsCreatedByEmployee[job.created_by] || 0) + 1
        recentBookings.push({
          employee: job.created_by,
          jobNumber: job.job_number,
          customerName: job.customer_name,
          date: job.occurred_at,
          type: 'created'
        })
      }
    })

    // Get dispatch data from activity_log
    let dispatchQuery = 'SELECT employee_id, COUNT(*) as count FROM activity_log WHERE type = $1'
    const dispatchParams = ['dispatch']
    let dispatchParamCount = 2

    if (from) {
      dispatchQuery += ` AND occurred_at >= $${dispatchParamCount}`
      dispatchParams.push(new Date(from).toISOString())
      dispatchParamCount++
    }

    if (to) {
      dispatchQuery += ` AND occurred_at <= $${dispatchParamCount}`
      dispatchParams.push(to.includes('T') ? to : `${to}T23:59:59.999Z`)
      dispatchParamCount++
    }

    dispatchQuery += ' GROUP BY employee_id'

    const dispatchResult = await pool.query(dispatchQuery, dispatchParams)
    dispatchResult.rows.forEach(row => {
      if (row.employee_id) {
        dispatchesByEmployee[row.employee_id] = row.count
      }
    })

    // Combine both data sources into scorecard
    const allEmployees = new Set([
      ...Object.keys(jobsCreatedByEmployee),
      ...Object.keys(dispatchesByEmployee)
    ])

    const scorecard = Array.from(allEmployees).map(empId => ({
      employeeId: empId,
      jobsCreated: jobsCreatedByEmployee[empId] || 0,
      dispatchesMade: dispatchesByEmployee[empId] || 0,
    })).sort((a, b) => (b.jobsCreated + b.dispatchesMade) - (a.jobsCreated + a.dispatchesMade))

    res.json({
      scorecard,
      recentBookings: recentBookings.slice(0, 20),
      summary: {
        totalJobsCreated: jobs.length,
        totalDispatches: Object.values(dispatchesByEmployee).reduce((a, b) => a + b, 0),
        uniqueEmployees: allEmployees.size,
      }
    })
  } catch (err) {
    console.error('Scorecard error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/migrate - Add employeeId column if not exists
app.post('/api/migrate', async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE activity_log
      ADD COLUMN IF NOT EXISTS employee_id INTEGER
    `)
    res.json({ status: 'success', message: 'employee_id column added to activity_log' })
  } catch (err) {
    console.error('Migration error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Serve React app for all other routes (SPA fallback)
app.use((req, res) => {
  res.sendFile(process.cwd() + '/dist/index.html')
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Activity App running on port ${PORT}`)
})
