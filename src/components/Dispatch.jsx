import { useState, useEffect } from 'react'

const EMPLOYEE_MAP = {
  '63732950': 'Charlet Butler',
  '78602964': 'Kaila Ferraris',
  '10254': 'Brittany Magdaleno',
  '79202258': 'Michael Molina',
  '62148947': 'Alyssa Power',
  '78143325': 'Chamille Mendros',
  '79166940': 'Alec Sunga',
  '62905893': 'Miranda Hahn',
  '79343306': 'Angel Pacaldo',
  '65908059': 'Tracie Huss',
  '62870802': 'Kenia Simkins',
}

function Dispatch({ fromDate, toDate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3001'

  useEffect(() => {
    fetchScorecard()
  }, [fromDate, toDate])

  async function fetchScorecard() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate + 'T23:59:59.999Z',
      })

      const response = await fetch(`${API_BASE}/api/scorecard?${params}`)
      if (!response.ok) throw new Error('Failed to fetch scorecard')
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching scorecard:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card text-center py-8"><p className="text-gray-600 dark:text-gray-400">Loading scorecard...</p></div>
  }

  if (error) {
    return <div className="card bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4">{error}</div>
  }

  if (!data) {
    return <div className="card text-center py-8"><p className="text-gray-600 dark:text-gray-400">No data available</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-3xl font-bold text-blue-600">{data.summary.totalJobsCreated}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Jobs Created</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-purple-600">{data.summary.totalDispatches}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Dispatches Made</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-orange-600">{data.summary.uniqueEmployees}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Team Members Active</div>
        </div>
      </div>

      {/* Employee Scorecard */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Employee Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Jobs Created</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Dispatches</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.scorecard.map((row) => (
                <tr key={row.employeeId} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">
                    {EMPLOYEE_MAP[String(row.employeeId)] || `Employee ${row.employeeId}`}
                  </td>
                  <td className="py-3 px-3 text-center text-blue-600 font-semibold">{row.jobsCreated}</td>
                  <td className="py-3 px-3 text-center text-purple-600 font-semibold">{row.dispatchesMade}</td>
                  <td className="py-3 px-3 text-center text-orange-600 font-bold">{row.jobsCreated + row.dispatchesMade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Bookings */}
      {data.recentBookings && data.recentBookings.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Bookings</h2>
          <div className="space-y-2">
            {data.recentBookings.map((booking, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {EMPLOYEE_MAP[String(booking.employee)] || booking.employee}
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    booked Job #{booking.jobNumber} for {booking.customerName}
                  </span>
                </div>
                <span className="text-gray-600 dark:text-gray-400 text-xs">
                  {new Date(booking.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dispatch
