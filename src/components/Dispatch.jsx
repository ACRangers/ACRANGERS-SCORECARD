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
    fetchScorecard()
  }, [fromDate, toDate])

  async function fetchScorecard() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `${API_BASE}/api/scorecard?from=${fromDate}&to=${toDate}`
      )
      if (!response.ok) throw new Error('Failed to fetch scorecard')
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card text-center py-8"><p className="text-gray-600 dark:text-gray-400">Loading...</p></div>
  }

  if (error) {
    return <div className="card bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4">{error}</div>
  }

  if (!data || !data.scorecard) {
    return <div className="card text-center py-8"><p className="text-gray-600 dark:text-gray-400">No data</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Employee Scorecard</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Created</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Booked</th>
              </tr>
            </thead>
            <tbody>
              {data.scorecard.map((row) => (
                <tr key={row.employeeId} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">
                    {EMPLOYEE_MAP[row.employeeId] || `Employee ${row.employeeId}`}
                  </td>
                  <td className="py-3 px-3 text-center text-blue-600 font-semibold">{row.created}</td>
                  <td className="py-3 px-3 text-center text-purple-600 font-semibold">{row.booked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dispatch
