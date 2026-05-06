import { useMemo } from 'react'

export default function Dashboard({ activities }) {
  const summary = useMemo(() => {
    return {
      creations: activities.filter(a => a.type === 'creation').length,
      updates: activities.filter(a => a.type === 'update').length,
      dispatches: activities.filter(a => a.type === 'dispatch').length,
      total: activities.length,
    }
  }, [activities])

  const recentActivities = useMemo(() => {
    return activities
      .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
      .slice(0, 20)
  }, [activities])

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {summary.total}
          </div>
          <p className="text-gray-600 dark:text-gray-400">Total Activities</p>
        </div>
        <div className="card">
          <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
            {summary.creations}
          </div>
          <p className="text-gray-600 dark:text-gray-400">Jobs Created</p>
        </div>
        <div className="card">
          <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
            {summary.updates}
          </div>
          <p className="text-gray-600 dark:text-gray-400">WOS Updates</p>
        </div>
        <div className="card">
          <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            {summary.dispatches}
          </div>
          <p className="text-gray-600 dark:text-gray-400">Dispatches</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Activities
        </h2>
        {recentActivities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No activities found</p>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-3 h-3 rounded-full mt-1 ${
                      activity.type === 'creation'
                        ? 'bg-green-500'
                        : activity.type === 'update'
                        ? 'bg-orange-500'
                        : 'bg-purple-500'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {activity.job_number}
                    </span>
                    <span className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 capitalize">
                      {activity.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.customer_name}
                  </p>
                  {activity.type === 'update' && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {activity.old_stage} → {activity.new_stage}
                    </p>
                  )}
                  {activity.type === 'creation' && activity.created_by && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Created by {activity.created_by}
                    </p>
                  )}
                  {activity.type === 'dispatch' && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {activity.tech_name} dispatched by {activity.dispatcher_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(activity.occurred_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
