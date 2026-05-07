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

// ServiceTitan token cache
let stTokenCache = { token: null, expiresAt: 0 }

async function getServiceTitanToken() {
  if (stTokenCache.token && Date.now() < stTokenCache.expiresAt) {
    return stTokenCache.token
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.ST_CLIENT_ID,
      client_secret: process.env.ST_CLIENT_SECRET,
    })

    const res = await fetch(process.env.ST_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })

    const data = await res.json()
    stTokenCache.token = data.access_token
    stTokenCache.expiresAt = Date.now() + (data.expires_in * 1000) - 60000
    return data.access_token
  } catch (err) {
    console.error('Failed to get ServiceTitan token:', err)
    throw err
  }
}

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

// EMPLOYEE_MAP
const EMPLOYEE_MAP = {
  63732950: 'Charlet Butler',
  78602964: 'Kaila Ferraris',
  10254: 'Brittany Magdaleno',
  79202258: 'Michael Molina',
  62148947: 'Alyssa Power',
  78143325: 'Chamille Mendros',
  79166940: 'Alec Sunga',
  62905893: 'Miranda Hahn',
  79343306: 'Angel Pacaldo',
  65908059: 'Tracie Huss',
  62870802: 'Kenia Simkins',
}

// GET /api/scorecard - Fetch from ServiceTitan API
app.get('/api/scorecard', async (req, res) => {
  try {
    const { from, to } = req.query
    const token = await getServiceTitanToken()

    const fromDate = from || new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]
    const toDate = to || new Date().toISOString().split('T')[0]

    // Fetch jobs created in date range from ServiceTitan
    const jobsRes = await fetch(
      `${process.env.ST_API_URL}/jpm/v2/tenant/${process.env.ST_TENANT_ID}/jobs?createdOnOrAfter=${fromDate}&createdOnOrBefore=${toDate}&pageSize=500`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'ST-App-Key': process.env.ST_APP_KEY,
        }
      }
    )

    if (!jobsRes.ok) throw new Error(`ServiceTitan API error: ${jobsRes.status}`)

    const jobsData = await jobsRes.json()
    const jobs = jobsData.data || []

    const jobsCreated = {}
    const dispatchesMade = {}

    // Process each job
    for (const job of jobs) {
      // Count job created by employee
      if (job.createdById) {
        jobsCreated[job.createdById] = (jobsCreated[job.createdById] || 0) + 1
      }

      // Get job history for technician assignments
      try {
        const historyRes = await fetch(
          `${process.env.ST_API_URL}/jpm/v2/tenant/${process.env.ST_TENANT_ID}/jobs/${job.id}/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'ST-App-Key': process.env.ST_APP_KEY,
            }
          }
        )

        if (historyRes.ok) {
          const historyData = await historyRes.json()
          const events = historyData.data || []

          // Find Technician Assigned events
          events.forEach(event => {
            if (event.eventType === 'Technician Assigned' && event.employeeId) {
              dispatchesMade[event.employeeId] = (dispatchesMade[event.employeeId] || 0) + 1
            }
          })
        }
      } catch (err) {
        console.error(`Error fetching history for job ${job.id}:`, err.message)
      }
    }

    // Combine and create scorecard
    const allEmployees = new Set([...Object.keys(jobsCreated), ...Object.keys(dispatchesMade)])

    const scorecard = Array.from(allEmployees).map(empId => {
      const numId = parseInt(empId)
      return {
        employeeId: numId,
        jobsCreated: jobsCreated[empId] || 0,
        dispatchesMade: dispatchesMade[empId] || 0,
      }
    }).sort((a, b) => (b.jobsCreated + b.dispatchesMade) - (a.jobsCreated + a.dispatchesMade))

    res.json({
      scorecard,
      summary: {
        totalJobsCreated: Object.values(jobsCreated).reduce((a, b) => a + b, 0),
        totalDispatches: Object.values(dispatchesMade).reduce((a, b) => a + b, 0),
        jobsProcessed: jobs.length,
      }
    })
  } catch (err) {
    console.error('Scorecard error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/migrate - Create dispatches table
app.post('/api/migrate', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dispatches (
        id SERIAL PRIMARY KEY,
        job_id INTEGER,
        job_number VARCHAR(50),
        event_type VARCHAR(100),
        employee_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    res.json({ status: 'success', message: 'dispatches table created' })
  } catch (err) {
    console.error('Migration error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/sync-dispatches - Fetch Job History API and store Technician Assigned events
app.post('/api/sync-dispatches', async (req, res) => {
  try {
    const { from, to } = req.body

    // Get all unique job IDs from activity_log in date range
    let query = 'SELECT DISTINCT job_id, job_number FROM activity_log WHERE job_id IS NOT NULL'
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
    const jobs = jobResult.rows

    let syncedCount = 0
    let errorCount = 0

    // Fetch Job History API for each job
    for (const job of jobs) {
      try {
        const historyRes = await fetch(`https://hvac-tracker-production.up.railway.app/api/debug/job-history?jobId=${job.job_id}`)
        if (!historyRes.ok) continue

        const events = await historyRes.json()
        if (Array.isArray(events)) {
          // Find "Technician Assigned" events
          for (const event of events) {
            if (event.eventType === 'Technician Assigned' && event.employeeId) {
              // Store in dispatches table
              await pool.query(
                `INSERT INTO dispatches (job_id, job_number, event_type, employee_id)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING`,
                [job.job_id, job.job_number, event.eventType, event.employeeId]
              )
              syncedCount++
            }
          }
        }
      } catch (err) {
        console.error(`Error syncing job ${job.job_id}:`, err.message)
        errorCount++
      }
    }

    res.json({
      status: 'success',
      message: `Synced ${syncedCount} dispatch events`,
      errors: errorCount,
      jobsProcessed: jobs.length
    })
  } catch (err) {
    console.error('Sync error:', err)
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
