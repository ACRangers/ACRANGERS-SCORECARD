import express from 'express'
import cors from 'cors'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('dist'))

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// ServiceTitan token cache
let stTokenCache = { token: null, expiresAt: 0 }

async function getServiceTitanToken() {
  if (stTokenCache.token && Date.now() < stTokenCache.expiresAt) {
    return stTokenCache.token
  }

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
}

// Create tables on startup
async function setupDatabase() {
  try {
    console.log('Attempting to create tables...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY,
        created_by_id INTEGER,
        created_at TIMESTAMP
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dispatches (
        id SERIAL PRIMARY KEY,
        job_id INTEGER,
        employee_id INTEGER,
        created_at TIMESTAMP,
        UNIQUE(job_id, employee_id)
      )
    `)
    console.log('✓ Tables ready')
  } catch (err) {
    console.error('Setup error:', err.message, err.stack)
  }
}

setupDatabase()

// POST /api/sync - Pull from ServiceTitan, cache in database
app.post('/api/sync', async (req, res) => {
  try {
    const { from, to } = req.body
    const fromDate = from || new Date(Date.now() - 90*24*60*60*1000).toISOString().split('T')[0]
    const toDate = to || new Date().toISOString().split('T')[0]

    console.log(`Syncing jobs from ${fromDate} to ${toDate}`)
    const token = await getServiceTitanToken()

    // 1. Get jobs created in date range
    const jobsRes = await fetch(
      `${process.env.ST_API_URL}/jpm/v2/tenant/${process.env.ST_TENANT_ID}/jobs?createdOnOrAfter=${fromDate}&createdOnOrBefore=${toDate}&pageSize=500`,
      { headers: { Authorization: `Bearer ${token}`, 'ST-App-Key': process.env.ST_APP_KEY } }
    )

    const jobsData = await jobsRes.json()
    const jobs = jobsData.data || []

    // Store jobs in database
    for (const job of jobs) {
      await pool.query(
        `INSERT INTO jobs (id, created_by_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [job.id, job.createdById, job.createdOn]
      )
    }

    // 2. For each job, get history and find "Technician Assigned" events
    let dispatchesStored = 0
    for (const job of jobs) {
      const historyRes = await fetch(
        `${process.env.ST_API_URL}/jpm/v2/tenant/${process.env.ST_TENANT_ID}/jobs/${job.id}/history`,
        { headers: { Authorization: `Bearer ${token}`, 'ST-App-Key': process.env.ST_APP_KEY } }
      )

      const historyData = await historyRes.json()
      const events = historyData.data || historyData.history || []

      for (const event of events) {
        if (event.eventType === 'Technician Assigned' && event.employeeId) {
          await pool.query(
            `INSERT INTO dispatches (job_id, employee_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (job_id, employee_id) DO NOTHING`,
            [job.id, event.employeeId, event.date]
          )
          dispatchesStored++
        }
      }
    }

    res.json({ status: 'success', jobsStored: jobs.length, dispatchesStored })
  } catch (err) {
    console.error('Sync error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/scorecard - Read database and count
app.get('/api/scorecard', async (req, res) => {
  try {
    const { from, to } = req.query
    const fromDate = from || new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]
    const toDate = to || new Date().toISOString().split('T')[0]

    console.log(`Scorecard query: ${fromDate} to ${toDate}`)

    // Count jobs created per employee
    const createdRes = await pool.query(
      `SELECT created_by_id, COUNT(*) as count FROM jobs WHERE created_at >= $1 AND created_at <= $2 GROUP BY created_by_id`,
      [fromDate, toDate]
    )

    console.log(`Jobs created rows: ${createdRes.rows.length}`)

    const created = {}
    createdRes.rows.forEach(row => {
      created[row.created_by_id] = parseInt(row.count)
    })

    // Count dispatches per employee
    const dispatchesRes = await pool.query(
      `SELECT employee_id, COUNT(DISTINCT job_id) as count FROM dispatches WHERE created_at >= $1 AND created_at <= $2 GROUP BY employee_id`,
      [fromDate, toDate]
    )

    console.log(`Dispatches rows: ${dispatchesRes.rows.length}`)

    const booked = {}
    dispatchesRes.rows.forEach(row => {
      booked[row.employee_id] = parseInt(row.count)
    })

    // Combine
    const allEmployees = new Set([...Object.keys(created), ...Object.keys(booked)])
    const scorecard = Array.from(allEmployees).map(empId => {
      const id = parseInt(empId)
      return {
        employeeId: id,
        created: created[empId] || 0,
        booked: booked[empId] || 0,
      }
    }).sort((a, b) => (b.created + b.booked) - (a.created + a.booked))

    res.json({ scorecard })
  } catch (err) {
    console.error('Scorecard error:', err.message, err.stack)
    res.status(500).json({ error: err.message })
  }
})

// SPA fallback
app.use((req, res) => {
  res.sendFile(process.cwd() + '/dist/index.html')
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Activity App running on port ${PORT}`)
})
