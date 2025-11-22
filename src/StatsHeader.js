import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * StatsHeader v2 Component
 * 
 * Simplified dashboard showing:
 * - Total Units (all time)
 * - This Week's Units
 * - Average Progress
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
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 mb-6 animate-pulse">
        <div className="h-8 bg-blue-700 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-blue-700 rounded"></div>
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
      subtitle: `of ${stats.targetUnits.toLocaleString()} target`,
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: '🔥',
      label: 'This Week',
      value: stats.weekUnits.toLocaleString(),
      subtitle: 'units (last 7 days)',
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
    <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 mb-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span className="text-3xl">📊</span>
          <span>Team Dashboard</span>
        </h2>
        <button
          onClick={fetchStats}
          className="text-sm text-gray-400 hover:text-white transition flex items-center space-x-1"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.color} rounded-lg p-5 shadow-lg transform transition-all duration-200 hover:scale-105`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-4xl">{stat.icon}</span>
            </div>
            <div className="text-white">
              <p className="text-sm opacity-90 mb-1">{stat.label}</p>
              <p className="text-4xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs opacity-75">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Progress Bar */}
      {stats.avgProgress > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Team Average Progress</span>
            <span className="text-sm font-bold text-white">{stats.avgProgress}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                stats.avgProgress >= 100 ? 'bg-green-500' :
                stats.avgProgress >= 75 ? 'bg-yellow-500' :
                stats.avgProgress >= 50 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(stats.avgProgress, 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsHeader
