import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#10b981', '#f59e0b', '#a855f7']

export default function Charts({ activities }) {
  const dailyStats = useMemo(() => {
    const stats = {}

    activities.forEach((activity) => {
      const date = new Date(activity.occurred_at).toLocaleDateString()
      if (!stats[date]) {
        stats[date] = { date, creation: 0, update: 0, dispatch: 0 }
      }
      stats[date][activity.type]++
    })

    return Object.values(stats).sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [activities])

  const typeDistribution = useMemo(() => {
    const counts = {
      creation: activities.filter(a => a.type === 'creation').length,
      update: activities.filter(a => a.type === 'update').length,
      dispatch: activities.filter(a => a.type === 'dispatch').length,
    }

    return [
      { name: 'Job Creation', value: counts.creation },
      { name: 'WOS Update', value: counts.update },
      { name: 'Dispatch', value: counts.dispatch },
    ].filter(item => item.value > 0)
  }, [activities])

  const stageTransitions = useMemo(() => {
    const transitions = {}

    activities
      .filter(a => a.type === 'update')
      .forEach((activity) => {
        const key = `${activity.old_stage} → ${activity.new_stage}`
        transitions[key] = (transitions[key] || 0) + 1
      })

    return Object.entries(transitions)
      .map(([key, count]) => ({ transition: key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [activities])

  const technicianDispatch = useMemo(() => {
    const techs = {}

    activities
      .filter(a => a.type === 'dispatch')
      .forEach((activity) => {
        const tech = activity.tech_name || 'Unknown'
        techs[tech] = (techs[tech] || 0) + 1
      })

    return Object.entries(techs)
      .map(([name, count]) => ({ name, dispatch_count: count }))
      .sort((a, b) => b.dispatch_count - a.count)
  }, [activities])

  return (
    <div className="space-y-8">
      {/* Activity Type Distribution */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Activity Type Distribution
        </h2>
        {typeDistribution.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No data available
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {typeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily Activity Trend */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Daily Activity Trend
        </h2>
        {dailyStats.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No data available
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="creation" stackId="a" fill="#10b981" name="Job Creation" />
              <Bar dataKey="update" stackId="a" fill="#f59e0b" name="WOS Update" />
              <Bar dataKey="dispatch" stackId="a" fill="#a855f7" name="Dispatch" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily Trend Line Chart */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Activity Count Over Time
        </h2>
        {dailyStats.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No data available
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="creation"
                stroke="#10b981"
                name="Job Creation"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="update"
                stroke="#f59e0b"
                name="WOS Update"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="dispatch"
                stroke="#a855f7"
                name="Dispatch"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Stage Transitions */}
      {stageTransitions.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Top 10 Stage Transitions
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={stageTransitions}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="transition" type="category" width={200} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Technician Dispatch Count */}
      {technicianDispatch.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Technician Dispatch Count
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={technicianDispatch}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="dispatch_count" fill="#06b6d4" name="Dispatches" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
