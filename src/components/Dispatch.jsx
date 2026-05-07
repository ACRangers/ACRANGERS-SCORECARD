import { useState, useEffect } from 'react'

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

function Dispatch({ fromDate, toDate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3001'

  useEffect(() => {
    fetchJobHistory()
  }, [fromDate, toDate])

  async function fetchJobHistory() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate + 'T23:59:59.999Z',
      })

      const response = await fetch(`${API_BASE}/api/job-history?${params}`)
      if (!response.ok) throw new Error('Failed to fetch job history')
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching job history:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card text-center py-8"><p className="text-gray-600 dark:text-gray-400">Loading dispatch data...</p></div>
  }

  if (error) {
    return <div className="card bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4">{error}</div>
  }

  if (!data) {
    return <div className="card text-center py-8"><p className="text-gray-600 dark:text-gray-400">No data available</p></div>
  }

  const employeeEntries = Object.entries(data.employeeTotals || {})
    .sort((a, b) => b[1].count - a[1].count)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-3xl font-bold text-blue-600">{data.jobCount || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Jobs in Period</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-purple-600">{employeeEntries.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Technicians Assigned</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-orange-600">{data.events?.length || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Technician Activity</h2>
        <div className="space-y-3">
          {employeeEntries.map(([employeeId, data]) => (
            <div key={employeeId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {EMPLOYEE_MAP[employeeId] || `Employee ${employeeId}`}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {data.events.map(e => e.eventType).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{data.count}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">events</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.events && data.events.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">All Events</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.events.slice(0, 50).map((event, idx) => (
              <div key={idx} className="flex justify-between p-2 border-b border-gray-200 dark:border-slate-600 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{event.eventType}</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">• {EMPLOYEE_MAP[event.employeeId] || `Employee ${event.employeeId}`}</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400">{new Date(event.date).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dispatch
