import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * ProgressCard Component
 * 
 * Displays an account with:
 * - Current promo status (on promo or not)
 * - Progress bar if on promo
 * - Assign/Change promo button
 * - Quick log units button
 */

const ProgressCard = ({ account, onAssignPromo, onQuickLog, onUpdate }) => {
  const [promoData, setPromoData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [totalUnits, setTotalUnits] = useState(0)
  const [lastActivity, setLastActivity] = useState(null)

  useEffect(() => {
    fetchPromoData()
  }, [account.id])

  const fetchPromoData = async () => {
    try {
      // Get account's current promo assignment
      const { data: accountPromo, error: promoError } = await supabase
        .from('account_promos')
        .select(`
          *,
          promos (
            id,
            promo_name,
            promo_code,
            start_date,
            end_date,
            is_active
          )
        `)
        .eq('account_id', account.id)
        .order('assigned_date', { ascending: false })
        .limit(1)
        .single()

      if (promoError && promoError.code !== 'PGRST116') {
        throw promoError
      }

      setPromoData(accountPromo)

      // If on a promo, calculate total units
      if (accountPromo && accountPromo.promo_id) {
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('units_sold, transaction_date, reps(name)')
          .eq('account_id', account.id)
          .eq('promo_id', accountPromo.promo_id)
          .order('created_at', { ascending: false })

        if (transError) throw transError

        const total = transactions?.reduce((sum, t) => sum + t.units_sold, 0) || 0
        setTotalUnits(total)

        // Get last activity
        if (transactions && transactions.length > 0) {
          setLastActivity(transactions[0])
        }
      }
    } catch (error) {
      console.error('Error fetching promo data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = () => {
    if (!promoData || !promoData.target_units) return 0
    return Math.round((totalUnits / promoData.target_units) * 100)
  }

  const getProgressColor = () => {
    const progress = calculateProgress()
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getProgressBarColor = () => {
    const progress = calculateProgress()
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/4"></div>
      </div>
    )
  }

  const progress = calculateProgress()
  const isOnPromo = promoData && promoData.promos

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition">
      {/* Account Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{account.account_name}</h3>
          <p className="text-sm text-gray-400">{account.territory}</p>
        </div>
      </div>

      {/* Promo Status */}
      {isOnPromo ? (
        <div className="space-y-4">
          {/* Promo Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-white font-medium">{promoData.promos.promo_name}</p>
                <p className="text-sm text-gray-400">({promoData.promos.promo_code})</p>
              </div>
            </div>
            <button
              onClick={() => onAssignPromo(account)}
              className="text-sm text-blue-400 hover:text-blue-300 transition"
            >
              Change Promo
            </button>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">
                Progress: <span className="font-semibold text-white">{totalUnits}</span> / {promoData.target_units} units
              </span>
              <span className={`text-sm font-semibold ${
                progress >= 100 ? 'text-green-400' : 
                progress >= 50 ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                {progress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor()} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Last Activity */}
          {lastActivity && (
            <div className="text-sm text-gray-400">
              Last logged: <span className="text-white">{lastActivity.units_sold} units</span> by{' '}
              <span className="text-white">{lastActivity.reps?.name}</span>{' '}
              ({formatDate(lastActivity.transaction_date)})
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => onQuickLog(account, promoData)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Quick Log Units
          </button>
        </div>
      ) : (
        // Not on promo
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-yellow-500">
            <span className="text-2xl">⚠️</span>
            <p className="font-medium">NOT ON PROMO</p>
          </div>
          
          <p className="text-sm text-gray-400">
            This account hasn't been assigned to a promo yet.
          </p>

          <button
            onClick={() => onAssignPromo(account)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            🎯 Assign to Promo
          </button>
        </div>
      )}
    </div>
  )
}

export default ProgressCard
