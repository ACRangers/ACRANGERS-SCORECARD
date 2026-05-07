import { useState, useEffect } from 'react'
import './App.css'

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

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])

  const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3001'

  useEffect(() => {
    fetchScorecard()
  }, [fromDate, toDate])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchScorecard()
    }, 60000)
    return () => clearInterval(interval)
  }, [fromDate, toDate])

  async function fetchScorecard() {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/scorecard?from=${fromDate}&to=${toDate}`)
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AC Rangers Scorecard</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
        ) : data && data.scorecard ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Employee</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Created</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Booked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {data.scorecard.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-3 text-sm text-gray-900 dark:text-white font-medium">
                      {EMPLOYEE_MAP[row.employeeId] || `Employee ${row.employeeId}`}
                    </td>
                    <td className="px-6 py-3 text-center text-sm text-blue-600 dark:text-blue-400 font-semibold">{row.created}</td>
                    <td className="px-6 py-3 text-center text-sm text-purple-600 dark:text-purple-400 font-semibold">{row.booked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">No data available</div>
        )}
      </div>
    </div>
  )
}

export default App
