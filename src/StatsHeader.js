import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * StatsHeader Professional Component
 * 
 * Refined design:
 * - Sophisticated color palette (muted tones)
 * - Better typography and spacing
 * - Subtle depth with borders
 * - Compact but elegant
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
      const { data: accountPromos } = await supabase
        .from('account_promos')
        .select('account_id, target_units')

      const targetUnits = accountPromos?.reduce((sum, ap) => sum + ap.target_units, 0) || 0

      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('units_sold, transaction_date, account_id')

      const totalUnits = allTransactions?.reduce((sum, t) => sum + t.units_sold, 0) || 0

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const weekStart = oneWeekAgo.toISOString().split('T')[0]

      const weekTransactions = allTransactions?.filter(t => t.transaction_date >= weekStart) || []
      const weekUnits = weekTransactions.reduce((sum, t) => sum + t.units_sold, 0)

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
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-700/50 rounded-lg"></div>
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
      gradient: 'from-blue-500/90 to-indigo-600/90',
      shadow: 'shadow-blue-500/20'
    },
    {
      icon: '🔥',
      label: 'This Week',
      value: stats.weekUnits.toLocaleString(),
      subtitle: 'last 7 days',
      gradient: 'from-orange-500/90 to-rose-600/90',
      shadow: 'shadow-orange-500/20'
    },
    {
      icon: '📈',
      label: 'Avg Progress',
      value: `${stats.avgProgress}%`,
      subtitle: 'per account',
      gradient: stats.avgProgress >= 75 ? 'from-emerald-500/90 to-green-600/90' : 
                stats.avgProgress >= 50 ? 'from-amber-500/90 to-yellow-600/90' :
                'from-slate-500/90 to-slate-600/90',
      shadow: stats.avgProgress >= 75 ? 'shadow-emerald-500/20' : 
              stats.avgProgress >= 50 ? 'shadow-amber-500/20' :
              'shadow-slate-500/20'
    }
  ]

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-6 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center space-x-2">
          <span className="text-base">📊</span>
          <span>Team Performance</span>
        </h2>
        <button
          onClick={fetchStats}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-700/50"
          title="Refresh stats"
        >
          <span className="text-sm">🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.gradient} backdrop-blur-sm rounded-lg p-4 ${stat.shadow} shadow-lg border border-white/10 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl opacity-90">{stat.icon}</span>
              <span className="text-xs font-medium text-white/70 uppercase tracking-wide">{stat.label}</span>
            </div>
            <div className="text-white">
              <p className="text-2xl font-semibold tabular-nums mb-0.5">{stat.value}</p>
              <p className="text-xs text-white/60 font-normal">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatsHeader
