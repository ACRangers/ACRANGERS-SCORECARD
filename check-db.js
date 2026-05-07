import pg from 'pg'

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:ahPxdUksoWLLAPRAdojcMzJLxyyPcExh@postgres.railway.internal:5432/railway',
  ssl: { rejectUnauthorized: false }
})

async function check() {
  try {
    const dispatches = await pool.query('SELECT COUNT(*) as count FROM dispatches')
    const jobs = await pool.query('SELECT COUNT(*) as count FROM jobs')
    console.log('Dispatches:', dispatches.rows[0].count)
    console.log('Jobs:', jobs.rows[0].count)
    
    // Check a sample dispatch
    const sample = await pool.query('SELECT * FROM dispatches LIMIT 5')
    console.log('Sample dispatches:', JSON.stringify(sample.rows, null, 2))
  } catch(e) {
    console.error(e)
  } finally {
    await pool.end()
  }
}
check()
