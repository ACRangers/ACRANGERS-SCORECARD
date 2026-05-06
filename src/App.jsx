import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Timeline from './components/Timeline'
import Charts from './components/Charts'
import './App.css'

function App() {
  function getTodayDate() {
    return new Date().toISOString().split('T')[0]
  }

  function getOneWeekAgoDate() {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  }

  const [activeView, setActiveView] = useState('dashboard')
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState(getOneWeekAgoDate())
  const [toDate, setToDate] = useState(getTodayDate())
  const [filters, setFilters] = useState({
    type: null,
    jobId: null,
    limit: 1000,
  })

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  useEffect(() => {
    fetchActivities()
  }, [fromDate, toDate, filters])

  async function fetchActivities() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate + 'T23:59:59.999Z',
        limit: filters.limit,
      })

      if (filters.type) params.append('type', filters.type)
      if (filters.jobId) params.append('job_id', filters.jobId)

      const response = await fetch(`${API_BASE}/api/activity?${params}`)
      const { data } = await response.json()
      setActivities(data || [])
    } catch (error) {
      console.error('Failed to fetch activities:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AC Rangers Activity Dashboard
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-4 py-2 rounded-lg transition ${
                activeView === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-4 py-2 rounded-lg transition ${
                activeView === 'timeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveView('charts')}
              className={`px-4 py-2 rounded-lg transition ${
                activeView === 'charts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600'
              }`}
            >
              Charts
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Type
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters({ ...filters, type: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="creation">Job Creation</option>
                <option value="update">WOS Update</option>
                <option value="dispatch">Dispatch</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job ID (Optional)
              </label>
              <input
                type="text"
                value={filters.jobId || ''}
                onChange={(e) => setFilters({ ...filters, jobId: e.target.value || null })}
                placeholder="e.g., 123456"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="card text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading activities...</p>
          </div>
        )}

        {!loading && activeView === 'dashboard' && (
          <Dashboard activities={activities} />
        )}

        {!loading && activeView === 'timeline' && (
          <Timeline activities={activities} />
        )}

        {!loading && activeView === 'charts' && (
          <Charts activities={activities} />
        )}
      </div>
    </div>
  )
}

export default App
