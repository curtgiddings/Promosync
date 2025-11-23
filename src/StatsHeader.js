import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * StatsHeader Compact Component
 * 
 * Smaller, less obtrusive version:
 * - Reduced padding
 * - Smaller text
 * - Less vertical space
 * - Still shows key metrics
 */

const StatsHeader = () => {
  const [stats, setStats] = useState({
    totalUnits: 0,
    weekUnits: 0,
    avgProgress: 0,
    targetUnits: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Get all account promos for calculations
      const { data: accountPromos } = await supabase
        .from('account_promos')
        .select('account_id, target_units')

      // Calculate total target
      const targetUnits = accountPromos?.reduce((sum, ap) => sum + ap.target_units, 0) || 0

      // Get all transactions
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('units_sold, transaction_date, account_id')

      // Calculate total units
      const totalUnits = allTransactions?.reduce((sum, t) => sum + t.units_sold, 0) || 0

      // Calculate this week's units (last 7 days)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const weekStart = oneWeekAgo.toISOString().split('T')[0]

      const weekTransactions = allTransactions?.filter(t => t.transaction_date >= weekStart) || []
      const weekUnits = weekTransactions.reduce((sum, t) => sum + t.units_sold, 0)

      // Calculate average progress per account
      let totalProgress = 0
      if (accountPromos && allTransactions) {
        accountPromos.forEach(ap => {
          const accountTransactions = allTransactions.filter(
            t => t.account_id === ap.account_id
          )
          const accountTotal = accountTransactions.reduce((sum, t) => sum + t.units_sold, 0)
          const progress = (accountTotal / ap.target_units) * 100
          totalProgress += progress
        })
      }
      const avgProgress = accountPromos?.length > 0 ? Math.round(totalProgress / accountPromos.length) : 0

      setStats({
        totalUnits,
        weekUnits,
        avgProgress,
        targetUnits
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 mb-4">
        <div className="grid grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    {
      icon: '📊',
      label: 'Total Units',
      value: stats.totalUnits.toLocaleString(),
      subtitle: `of ${stats.targetUnits.toLocaleString()}`,
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: '🔥',
      label: 'This Week',
      value: stats.weekUnits.toLocaleString(),
      subtitle: 'last 7 days',
      color: 'from-orange-500 to-red-600'
    },
    {
      icon: '📈',
      label: 'Avg Progress',
      value: `${stats.avgProgress}%`,
      subtitle: 'per account',
      color: stats.avgProgress >= 75 ? 'from-green-500 to-green-600' : 
             stats.avgProgress >= 50 ? 'from-yellow-500 to-yellow-600' :
             'from-purple-500 to-purple-600'
    }
  ]

  return (
    <div className="bg-gray-800 rounded-lg p-3 mb-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center space-x-1">
          <span>📊</span>
          <span>Team Stats</span>
        </h2>
        <button
          onClick={fetchStats}
          className="text-xs text-gray-500 hover:text-white transition flex items-center space-x-1"
        >
          <span>🔄</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.color} rounded-lg p-3 shadow-md`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-xs text-white/80">{stat.label}</span>
            </div>
            <div className="text-white">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs opacity-75">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatsHeader
