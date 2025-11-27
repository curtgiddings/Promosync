import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * ActivityFeed Component
 * 
 * Shows recent team activity:
 * - Units logged
 * - Promos assigned
 * - Notes added
 */

const ActivityFeed = ({ limit = 10, compact = false }) => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivity()
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('activity_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        () => fetchActivity()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [limit])

  const fetchActivity = async () => {
    try {
      // Try to use activity_log table first
      const { data: activityData, error: activityError } = await supabase
        .from('activity_log')
        .select(`
          id,
          action_type,
          details,
          created_at,
          accounts (account_name, territory),
          reps (name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!activityError && activityData) {
        setActivities(activityData)
        setLoading(false)
        return
      }

      // Fallback: Build activity from transactions table
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select(`
          id,
          units_sold,
          transaction_date,
          created_at,
          accounts (account_name, territory),
          reps (name),
          promos (promo_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (transError) throw transError

      // Transform transactions into activity format
      const activityFromTransactions = transactions?.map(t => ({
        id: t.id,
        action_type: 'units_logged',
        details: { 
          units: t.units_sold,
          promo_name: t.promos?.promo_name
        },
        created_at: t.created_at,
        accounts: t.accounts,
        reps: t.reps
      })) || []

      setActivities(activityFromTransactions)
    } catch (error) {
      console.error('Error fetching activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'units_logged': return '📝'
      case 'promo_assigned': return '🎯'
      case 'promo_changed': return '🔄'
      case 'note_added': return '💬'
      case 'account_created': return '🏢'
      default: return '📌'
    }
  }

  const getActionText = (activity) => {
    const repName = activity.reps?.name || 'Someone'
    const accountName = activity.accounts?.account_name || 'an account'
    
    switch (activity.action_type) {
      case 'units_logged':
        return (
          <>
            <strong className="text-white">{repName}</strong> logged{' '}
            <strong className="text-green-400">{activity.details?.units} units</strong> for{' '}
            <strong className="text-white">{accountName}</strong>
            {activity.details?.promo_name && (
              <span className="text-gray-500"> ({activity.details.promo_name})</span>
            )}
          </>
        )
      case 'promo_assigned':
        return (
          <>
            <strong className="text-white">{repName}</strong> assigned{' '}
            <strong className="text-white">{accountName}</strong> to{' '}
            <strong className="text-blue-400">{activity.details?.promo_name}</strong>
          </>
        )
      case 'promo_changed':
        return (
          <>
            <strong className="text-white">{repName}</strong> changed{' '}
            <strong className="text-white">{accountName}</strong>'s promo to{' '}
            <strong className="text-blue-400">{activity.details?.new_promo}</strong>
          </>
        )
      case 'note_added':
        return (
          <>
            <strong className="text-white">{repName}</strong> added a note to{' '}
            <strong className="text-white">{accountName}</strong>
          </>
        )
      default:
        return (
          <>
            <strong className="text-white">{repName}</strong> updated{' '}
            <strong className="text-white">{accountName}</strong>
          </>
        )
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              <div className="flex-1 h-4 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {activities.slice(0, 5).map((activity) => (
          <div 
            key={activity.id}
            className="flex items-center space-x-2 text-sm text-gray-400"
          >
            <span>{getActionIcon(activity.action_type)}</span>
            <span className="truncate flex-1">{getActionText(activity)}</span>
            <span className="text-gray-500 text-xs whitespace-nowrap">
              {getTimeAgo(activity.created_at)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-700/50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <span>📊</span>
          <span>Recent Activity</span>
        </h3>
        <button 
          onClick={fetchActivity}
          className="text-gray-400 hover:text-white text-sm transition"
        >
          Refresh
        </button>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-700/50">
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-3xl block mb-2">📭</span>
            <p className="text-gray-400">No recent activity</p>
            <p className="text-gray-500 text-sm mt-1">Activity will appear here as you log units</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div 
              key={activity.id}
              className="px-5 py-4 hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <span className="text-xl mt-0.5">
                  {getActionIcon(activity.action_type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm">
                    {getActionText(activity)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {getTimeAgo(activity.created_at)}
                    {activity.accounts?.territory && (
                      <span className="ml-2">• 📍 {activity.accounts.territory}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="px-5 py-3 bg-gray-900/50 border-t border-gray-700/50">
          <p className="text-gray-500 text-xs text-center">
            Showing last {activities.length} activities
          </p>
        </div>
      )}
    </div>
  )
}

export default ActivityFeed
