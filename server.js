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

// Auto-setup database on startup
async function setupDatabase() {
  try {
    console.log('Setting up database...')

    // Drop old tables and create fresh ones
    await pool.query(`
      DROP TABLE IF EXISTS dispatches CASCADE;
      DROP TABLE IF EXISTS jobs CASCADE;

      CREATE TABLE jobs (
        id INTEGER PRIMARY KEY,
        created_by_id INTEGER,
        created_at TIMESTAMP
      );

      CREATE TABLE dispatches (
        id SERIAL PRIMARY KEY,
        job_id INTEGER,
        employee_id INTEGER,
        created_at TIMESTAMP,
        UNIQUE(job_id, employee_id)
      );
    `)
    console.log('✓ Database tables created')

    // Auto-sync last 7 days of data
    console.log('Syncing data from ServiceTitan...')
    const token = await getServiceTitanToken()
    const fromDate = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]
    const toDate = new Date().toISOString().split('T')[0]

    const jobsRes = await fetch(
      `${process.env.ST_API_URL}/jpm/v2/tenant/${process.env.ST_TENANT_ID}/jobs?createdOnOrAfter=${fromDate}&createdOnOrBefore=${toDate}&pageSize=500`,
      { headers: { Authorization: `Bearer ${token}`, 'ST-App-Key': process.env.ST_APP_KEY } }
    )

    const jobsData = await jobsRes.json()
    const jobIds = (jobsData.data || []).map(j => j.id)

    let dispatchesStored = 0
    for (const jobId of jobIds) {
      const historyRes = await fetch(
        `${process.env.ST_API_URL}/jpm/v2/tenant/${process.env.ST_TENANT_ID}/jobs/${jobId}/history`,
        { headers: { Authorization: `Bearer ${token}`, 'ST-App-Key': process.env.ST_APP_KEY } }
      )

      const historyData = await historyRes.json()
      const events = historyData.data || []

      for (const event of events) {
        if (event.eventType === 'Technician Assigned' && event.employeeId) {
          await pool.query(
            `INSERT INTO dispatches (job_id, employee_id, created_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (job_id, employee_id) DO NOTHING`,
            [jobId, event.employeeId, event.occurredOn]
          )
          dispatchesStored++
        }
      }
    }

    console.log(`✓ Synced ${jobIds.length} jobs, stored ${dispatchesStored} dispatches`)
  } catch (err) {
    console.error('Database setup error:', err.message)
  }
}

setupDatabase()

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

// GET /api/scorecard - Employee performance: jobs created + dispatches
app.get('/api/scorecard', async (req, res) => {
  try {
    const { from, to } = req.query
    const fromDate = from || new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]
    const toDate = to ? (to.includes('T') ? to : `${to}T23:59:59.999Z`) : new Date().toISOString()

    // Count jobs created by employee
    const jobsResult = await pool.query(
      `SELECT created_by_id, COUNT(*) as count FROM jobs WHERE created_at >= $1 AND created_at <= $2 GROUP BY created_by_id`,
      [fromDate, toDate]
    )

    const jobsCreated = {}
    jobsResult.rows.forEach(row => {
      jobsCreated[row.created_by_id] = row.count
    })

    // Count dispatches by employee
    const dispatchesResult = await pool.query(
      `SELECT employee_id, COUNT(DISTINCT job_id) as count FROM dispatches WHERE created_at >= $1 AND created_at <= $2 GROUP BY employee_id`,
      [fromDate, toDate]
    )

    const dispatchesMade = {}
    dispatchesResult.rows.forEach(row => {
      dispatchesMade[row.employee_id] = row.count
    })

    // Build scorecard
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
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/migrate - Create clean database schema
app.post('/api/migrate', async (req, res) => {
  try {
    // Jobs table - tracks jobs created
    await pool.query(`
      DROP TABLE IF EXISTS dispatches CASCADE;
      DROP TABLE IF EXISTS jobs CASCADE;

      CREATE TABLE jobs (
        id INTEGER PRIMARY KEY,
        created_by_id INTEGER,
        created_at TIMESTAMP
      )
    `)

    // Dispatches table - tracks technician assignments
    await pool.query(`
      CREATE TABLE dispatches (
        id SERIAL PRIMARY KEY,
        job_id INTEGER,
        employee_id INTEGER,
        created_at TIMESTAMP,
        UNIQUE(job_id, employee_id)
      )
    `)

    res.json({ status: 'success', message: 'Database created fresh' })
  } catch (err) {
    console.error('Migration error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/sync - Sync jobs created and technician assigned dispatches
app.post('/api/sync', async (req, res) => {
  try {
    const { from, to } = req.body
    const fromDate = from || new Date(Date.now() - 1*24*60*60*1000).toISOString().split('T')[0]
    const toDate = to || new Date().toISOString().split('T')[0]

    const token = await getServiceTitanToken()

    // 1. Get jobs created in date range
    const jobsRes = await fetch(
      `${process.env.ST_API_URL}/jpm/v2/tenant/${process.env.ST_TENANT_ID}/jobs?createdOnOrAfter=${fromDate}&createdOnOrBefore=${toDate}&pageSize=500`,
      { headers: { Authorization: `Bearer ${token}`, 'ST-App-Key': process.env.ST_APP_KEY } }
    )

    const jobsData = await jobsRes.json()
    const jobIds = (jobsData.data || []).map(j => j.id)

    let jobsCreated = jobIds.length
    let dispatchesStored = 0

    // 2. For each job, get history and find Technician Assigned events
    for (const jobId of jobIds) {
      const historyRes = await fetch(
        `${process.env.ST_API_URL}/jpm/v2/tenant/${process.env.ST_TENANT_ID}/jobs/${jobId}/history`,
        { headers: { Authorization: `Bearer ${token}`, 'ST-App-Key': process.env.ST_APP_KEY } }
      )

      const historyData = await historyRes.json()
      const events = historyData.data || []

      for (const event of events) {
        if (event.eventType === 'Technician Assigned' && event.employeeId) {
          await pool.query(
            `INSERT INTO dispatches (job_id, event_type, employee_id, created_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (job_id, employee_id, event_type) DO NOTHING`,
            [jobId, event.eventType, event.employeeId, event.occurredOn]
          )
          dispatchesStored++
        }
      }
    }

    res.json({ jobsCreated, dispatchesStored, dateRange: { from: fromDate, to: toDate } })
  } catch (err) {
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
