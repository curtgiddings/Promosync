import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * StatsHeader Component - v2.8
 * 
 * Shows team-wide stats + Quarter Pace:
 * - Total units logged
 * - Average progress
 * - Accounts on promo
 * - Team goal percentage
 * - Quarter pace indicator (Ahead/On Pace/Behind)
 */

const StatsHeader = () => {
  const [stats, setStats] = useState({
    totalUnits: 0,
    accountsOnPromo: 0,
    totalAccounts: 0,
    teamGoal: 0,
    targetUnits: 0,
    behindPace: 0,
    metTarget: 0
  })
  const [quarterInfo, setQuarterInfo] = useState({
    name: 'Q4 2025',
    progress: 0, // % through quarter
    daysLeft: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchQuarterInfo()
  }, [])

  const fetchQuarterInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('quarters')
        .select('*')
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        const start = new Date(data.start_date)
        const end = new Date(data.end_date)
        const now = new Date()
        
        const totalDays = (end - start) / (1000 * 60 * 60 * 24)
        const daysPassed = (now - start) / (1000 * 60 * 60 * 24)
        const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
        
        const progress = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)))
        
        setQuarterInfo({
          name: data.name,
          progress,
          daysLeft
        })
      }
    } catch (error) {
      console.error('Error fetching quarter:', error)
    }
  }

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

      // Calculate team goal
      const teamGoal = targetUnits > 0 ? Math.round((totalUnits / targetUnits) * 100) : 0

      // Calculate per-account progress and count behind pace
      let behindPace = 0
      let metTarget = 0
      
      if (accountPromos && transactions) {
        // Get current quarter progress for comparison
        const { data: quarterData } = await supabase
          .from('quarters')
          .select('start_date, end_date')
          .eq('is_active', true)
          .single()
        
        let qProgress = 50 // default
        if (quarterData) {
          const start = new Date(quarterData.start_date)
          const end = new Date(quarterData.end_date)
          const now = new Date()
          const totalDays = (end - start) / (1000 * 60 * 60 * 24)
          const daysPassed = (now - start) / (1000 * 60 * 60 * 24)
          qProgress = Math.round((daysPassed / totalDays) * 100)
        }
        
        accountPromos.forEach(ap => {
          const accountTransactions = transactions.filter(
            t => t.account_id === ap.account_id
          )
          const accountTotal = accountTransactions.reduce((sum, t) => sum + t.units_sold, 0)
          const progress = ap.target_units > 0 ? (accountTotal / ap.target_units) * 100 : 0
          
          if (progress >= 100) {
            metTarget++
          } else if (progress < qProgress - 10) {
            behindPace++
          }
        })
      }

      setStats({
        totalUnits,
        accountsOnPromo,
        totalAccounts,
        teamGoal,
        targetUnits,
        behindPace,
        metTarget
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate pace status
  const getPaceStatus = () => {
    const { teamGoal } = stats
    const { progress: quarterProgress } = quarterInfo
    const diff = teamGoal - quarterProgress

    if (teamGoal >= 100) {
      return { status: 'Target Met! 🎉', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: '✅' }
    } else if (diff >= 10) {
      return { status: 'Ahead of Pace', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: '🚀' }
    } else if (diff >= -10) {
      return { status: 'On Pace', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: '📊' }
    } else {
      return { status: 'Behind Pace', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: '⚠️' }
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 mb-6 animate-pulse">
        <div className="h-8 bg-gray-600 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-600 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  const paceStatus = getPaceStatus()

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
      icon: '⚠️',
      label: 'Behind Pace',
      value: stats.behindPace,
      subtitle: stats.behindPace === 0 ? 'All on track!' : 'need attention',
      color: stats.behindPace === 0 ? 'from-green-500 to-green-600' : 
             stats.behindPace <= 2 ? 'from-yellow-500 to-yellow-600' : 
             'from-red-500 to-red-600'
    },
    {
      icon: '🏢',
      label: 'Accounts',
      value: `${stats.accountsOnPromo}/${stats.totalAccounts}`,
      subtitle: `${stats.metTarget} met target`,
      color: 'from-indigo-500 to-indigo-600'
    }
  ]

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 mb-6 shadow-xl border border-gray-700/50">
      {/* Header with Quarter Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span className="text-3xl">📊</span>
          <span>Team Dashboard</span>
        </h2>
        
        {/* Quarter & Pace Badge */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-900/50 px-3 py-1.5 rounded-lg">
            <span className="text-gray-400 text-sm">📅</span>
            <span className="text-white font-medium text-sm">{quarterInfo.name}</span>
            <span className="text-gray-500">•</span>
            <span className="text-blue-400 text-sm">{quarterInfo.progress}% complete</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 text-sm">{quarterInfo.daysLeft}d left</span>
          </div>
          
          <button
            onClick={() => { fetchStats(); fetchQuarterInfo(); }}
            className="text-gray-400 hover:text-white transition p-2 hover:bg-gray-700 rounded-lg"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Stat Cards */}
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

      {/* Progress Bar with Pace Indicator */}
      <div className="mt-5 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-300">Overall Team Progress</span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded ${paceStatus.bgColor} ${paceStatus.color}`}>
              {paceStatus.icon} {paceStatus.status}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-400">
              Progress: <span className="text-white font-bold">{stats.teamGoal}%</span>
            </span>
            <span className="text-gray-500">vs</span>
            <span className="text-gray-400">
              Quarter: <span className="text-blue-400 font-bold">{quarterInfo.progress}%</span>
            </span>
          </div>
        </div>
        
        {/* Dual Progress Bar */}
        <div className="relative">
          {/* Background */}
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            {/* Actual Progress */}
            <div
              className={`h-full transition-all duration-1000 ${
                stats.teamGoal >= 100 ? 'bg-green-500' :
                stats.teamGoal >= quarterInfo.progress ? 'bg-green-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(stats.teamGoal, 100)}%` }}
            />
          </div>
          
          {/* Quarter Progress Marker */}
          <div 
            className="absolute top-0 h-4 w-0.5 bg-blue-400 transition-all duration-500"
            style={{ left: `${quarterInfo.progress}%` }}
            title={`${quarterInfo.progress}% through quarter`}
          />
          
          {/* Quarter Progress Label */}
          <div 
            className="absolute -top-6 transform -translate-x-1/2 text-xs text-blue-400 whitespace-nowrap"
            style={{ left: `${quarterInfo.progress}%` }}
          >
            Expected
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end space-x-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-green-500 rounded"></span>
            <span>Actual Progress</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-1 bg-blue-400"></span>
            <span>Expected (Quarter)</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default StatsHeader
