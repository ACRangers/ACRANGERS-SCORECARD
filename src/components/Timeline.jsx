import { useMemo } from 'react'

export default function Timeline({ activities }) {
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
  }, [activities])

  const groupedByDate = useMemo(() => {
    const groups = {}
    sortedActivities.forEach((activity) => {
      const date = new Date(activity.occurred_at).toLocaleDateString()
      if (!groups[date]) groups[date] = []
      groups[date].push(activity)
    })
    return groups
  }, [sortedActivities])

  const getTypeColor = (type) => {
    switch (type) {
      case 'creation':
        return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
      case 'update':
        return 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700'
      case 'dispatch':
        return 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700'
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'creation':
        return '✨'
      case 'update':
        return '🔄'
      case 'dispatch':
        return '👤'
      default:
        return '📝'
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Activity Timeline
      </h2>

      {Object.keys(groupedByDate).length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No activities found
        </p>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-300 dark:border-slate-600">
                {date}
              </h3>
              <div className="space-y-3">
                {items.map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-4 rounded-lg border-l-4 ${getTypeColor(activity.type)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getTypeIcon(activity.type)}</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {activity.job_number}
                          </span>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                            {activity.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                          {activity.customer_name}
                        </p>

                        {activity.type === 'update' && (
                          <div className="mt-2 p-2 bg-white dark:bg-slate-700 rounded text-sm text-gray-700 dark:text-gray-300">
                            <strong>Status Change:</strong> {activity.old_stage} →{' '}
                            {activity.new_stage}
                            {activity.modified_by && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Modified by {activity.modified_by}
                              </p>
                            )}
                          </div>
                        )}

                        {activity.type === 'creation' && (
                          <div className="mt-2 p-2 bg-white dark:bg-slate-700 rounded text-sm text-gray-700 dark:text-gray-300">
                            <strong>Created by:</strong> {activity.created_by || 'Unknown'}
                          </div>
                        )}

                        {activity.type === 'dispatch' && (
                          <div className="mt-2 p-2 bg-white dark:bg-slate-700 rounded text-sm text-gray-700 dark:text-gray-300">
                            <strong>Technician:</strong> {activity.tech_name}
                            <br />
                            <strong>Dispatcher:</strong> {activity.dispatcher_name}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                        {new Date(activity.occurred_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
