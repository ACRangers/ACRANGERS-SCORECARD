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

// GET /api/scorecard - Dispatch scorecard from Job History API
app.get('/api/scorecard', async (req, res) => {
  try {
    const { from, to } = req.query

    // Get unique job IDs from activity_log
    let query = 'SELECT DISTINCT job_id FROM activity_log WHERE job_id IS NOT NULL'
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

    const jobResult = await pool.query(query, params)
    const jobIds = jobResult.rows.map(r => r.job_id)

    const dispatchesByEmployee = {}

    // Fetch Job History API for each job and count "Technician Assigned" events
    for (const jobId of jobIds) {
      try {
        const historyRes = await fetch(`https://hvac-tracker-production.up.railway.app/api/debug/job-history?jobId=${jobId}`)
        if (!historyRes.ok) continue

        const events = await historyRes.json()
        if (Array.isArray(events)) {
          events.forEach(event => {
            if (event.eventType === 'Technician Assigned' && event.employeeId) {
              const empId = event.employeeId
              dispatchesByEmployee[empId] = (dispatchesByEmployee[empId] || 0) + 1
            }
          })
        }
      } catch (err) {
        console.error(`Error fetching job history for job ${jobId}:`, err.message)
      }
    }

    // Convert to scorecard format
    const scorecard = Object.entries(dispatchesByEmployee)
      .map(([employeeId, count]) => ({
        employeeId: parseInt(employeeId),
        dispatchesMade: count
      }))
      .sort((a, b) => b.dispatchesMade - a.dispatchesMade)

    res.json({
      scorecard,
      summary: {
        totalDispatches: Object.values(dispatchesByEmployee).reduce((a, b) => a + b, 0),
        uniqueEmployees: Object.keys(dispatchesByEmployee).length,
        jobsChecked: jobIds.length
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
