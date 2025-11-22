import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * StatsHeader Component
 * 
 * Shows team-wide stats:
 * - Total units logged
 * - Average progress
 * - Accounts on promo
 * - Team goal percentage
 */

const StatsHeader = () => {
  const [stats, setStats] = useState({
    totalUnits: 0,
    avgProgress: 0,
    accountsOnPromo: 0,
    totalAccounts: 0,
    teamGoal: 0,
    targetUnits: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Get all accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')

      const totalAccounts = accounts?.length || 0

      // Get accounts on promo
      const { data: accountPromos } = await supabase
        .from('account_promos')
        .select('account_id, target_units')

      const accountsOnPromo = accountPromos?.length || 0

      // Calculate total target
      const targetUnits = accountPromos?.reduce((sum, ap) => sum + ap.target_units, 0) || 0

      // Get all transactions for active promos
      const { data: transactions } = await supabase
        .from('transactions')
        .select('units_sold, account_id, promo_id')

      // Calculate total units
      const totalUnits = transactions?.reduce((sum, t) => sum + t.units_sold, 0) || 0

      // Calculate average progress per account on promo
      let totalProgress = 0
      if (accountPromos && transactions) {
        accountPromos.forEach(ap => {
          const accountTransactions = transactions.filter(
            t => t.account_id === ap.account_id
          )
          const accountTotal = accountTransactions.reduce((sum, t) => sum + t.units_sold, 0)
          const progress = (accountTotal / ap.target_units) * 100
          totalProgress += progress
        })
      }
      const avgProgress = accountsOnPromo > 0 ? Math.round(totalProgress / accountsOnPromo) : 0

      // Calculate team goal
      const teamGoal = targetUnits > 0 ? Math.round((totalUnits / targetUnits) * 100) : 0

      setStats({
        totalUnits,
        avgProgress,
        accountsOnPromo,
        totalAccounts,
        teamGoal,
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-blue-700 rounded"></div>
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
      icon: '🎯',
      label: 'Team Goal',
      value: `${stats.teamGoal}%`,
      subtitle: stats.teamGoal >= 100 ? '🎉 Target Met!' : 'Keep going!',
      color: stats.teamGoal >= 100 ? 'from-green-500 to-green-600' : 
             stats.teamGoal >= 75 ? 'from-yellow-500 to-yellow-600' : 
             'from-red-500 to-red-600'
    },
    {
      icon: '📈',
      label: 'Avg Progress',
      value: `${stats.avgProgress}%`,
      subtitle: 'per account',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: '🏢',
      label: 'Accounts',
      value: `${stats.accountsOnPromo}/${stats.totalAccounts}`,
      subtitle: 'on active promo',
      color: 'from-indigo-500 to-indigo-600'
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.color} rounded-lg p-4 shadow-lg transform transition-all duration-200 hover:scale-105`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-3xl">{stat.icon}</span>
            </div>
            <div className="text-white">
              <p className="text-sm opacity-90 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs opacity-75">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar for Team Goal */}
      {stats.teamGoal > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Overall Team Progress</span>
            <span className="text-sm font-bold text-white">{stats.teamGoal}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                stats.teamGoal >= 100 ? 'bg-green-500' :
                stats.teamGoal >= 75 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(stats.teamGoal, 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsHeader
