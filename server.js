import express from 'express'
import cors from 'cors'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

console.log('ENV DEBUG: PGHOST=' + process.env.PGHOST + ' PGPORT=' + process.env.PGPORT)

const app = express()
app.use(cors())
app.use(express.json())

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
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
    const { type, job_id, job_number, customer_name, old_stage, new_stage, created_by, modified_by, dispatcher_name, tech_name } = req.body

    const result = await pool.query(
      `INSERT INTO activity_log (type, job_id, job_number, customer_name, old_stage, new_stage, created_by, modified_by, dispatcher_name, tech_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [type, job_id, job_number, customer_name, old_stage, new_stage, created_by, modified_by, dispatcher_name, tech_name]
    )

    res.status(201).json({ data: result.rows[0] })
  } catch (err) {
    console.error('Database error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Activity App API running on http://localhost:${PORT}`)
  console.log(`Database: ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`)
})
