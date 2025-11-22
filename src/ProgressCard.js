import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * ProgressCard v3 Component
 * 
 * Enhanced with:
 * - Expandable transaction history
 * - Better icons and badges
 * - Status indicators
 * - Improved visual hierarchy
 */

const ProgressCard = ({ account, onAssignPromo, onQuickLog, onUpdate }) => {
  const [promoData, setPromoData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [totalUnits, setTotalUnits] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [showHistory, setShowHistory] = useState(false)

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

      // If on a promo, get all transactions
      if (accountPromo && accountPromo.promo_id) {
        const { data: transactionData, error: transError } = await supabase
          .from('transactions')
          .select(`
            id,
            units_sold,
            transaction_date,
            notes,
            created_at,
            reps(name)
          `)
          .eq('account_id', account.id)
          .eq('promo_id', accountPromo.promo_id)
          .order('created_at', { ascending: false })

        if (transError) throw transError

        const total = transactionData?.reduce((sum, t) => sum + t.units_sold, 0) || 0
        setTotalUnits(total)
        setTransactions(transactionData || [])
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

  const getStatusBadge = () => {
    if (!promoData || !promoData.promos) {
      return { color: 'bg-gray-600', text: 'No Promo', icon: '⚪' }
    }
    
    const progress = calculateProgress()
    if (progress >= 100) {
      return { color: 'bg-green-600', text: 'Target Met', icon: '🟢' }
    } else if (progress >= 75) {
      return { color: 'bg-yellow-600', text: 'Near Target', icon: '🟡' }
    } else if (progress >= 50) {
      return { color: 'bg-orange-600', text: 'In Progress', icon: '🟠' }
    } else {
      return { color: 'bg-red-600', text: 'Behind', icon: '🔴' }
    }
  }

  const getProgressBarColor = () => {
    const progress = calculateProgress()
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-yellow-500'
    if (progress >= 50) return 'bg-orange-500'
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
  const statusBadge = getStatusBadge()

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
      {/* Account Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-2xl">🏢</span>
            <h3 className="text-xl font-bold text-white">{account.account_name}</h3>
          </div>
          <p className="text-sm text-gray-400 ml-8">📍 {account.territory}</p>
        </div>
        
        {/* Status Badge */}
        <span className={`${statusBadge.color} text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center space-x-1`}>
          <span>{statusBadge.icon}</span>
          <span>{statusBadge.text}</span>
        </span>
      </div>

      {/* Promo Status */}
      {isOnPromo ? (
        <div className="space-y-4">
          {/* Promo Info */}
          <div className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-white font-semibold">{promoData.promos.promo_name}</p>
                <p className="text-xs text-gray-400">Code: {promoData.promos.promo_code}</p>
              </div>
            </div>
            <button
              onClick={() => onAssignPromo(account, promoData)}
              className="text-sm text-blue-400 hover:text-blue-300 transition underline"
            >
              Change
            </button>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">
                <span className="font-bold text-white text-lg">{totalUnits}</span> / {promoData.target_units} units
              </span>
              <span className={`text-lg font-bold ${
                progress >= 100 ? 'text-green-400' : 
                progress >= 75 ? 'text-yellow-400' :
                progress >= 50 ? 'text-orange-400' :
                'text-red-400'
              }`}>
                {progress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className={`h-full ${getProgressBarColor()} transition-all duration-500 rounded-full relative`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Transaction History Toggle */}
          {transactions.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full text-left text-sm text-gray-400 hover:text-white transition py-2"
              >
                <span className="flex items-center space-x-2">
                  <span>{showHistory ? '▼' : '▶'}</span>
                  <span className="font-medium">
                    {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span>Last: {transactions[0].units_sold} units by {transactions[0].reps?.name} ({formatDate(transactions[0].transaction_date)})</span>
                </span>
              </button>

              {/* Expandable History */}
              {showHistory && (
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                  {transactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className="bg-gray-700/50 rounded-lg p-3 text-sm border-l-4 border-blue-500"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-400 font-bold">{transaction.units_sold} units</span>
                          <span className="text-gray-500">by</span>
                          <span className="text-white font-medium">{transaction.reps?.name}</span>
                        </div>
                        <span className="text-gray-400 text-xs">
                          {formatDate(transaction.transaction_date)}
                        </span>
                      </div>
                      {transaction.notes && (
                        <p className="text-gray-400 text-xs mt-1 italic">💬 {transaction.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => onQuickLog(account, promoData)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <span className="text-xl">➕</span>
            <span>Quick Log Units</span>
          </button>
        </div>
      ) : (
        // Not on promo
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-yellow-500 bg-yellow-500/10 border border-yellow-500 rounded-lg p-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="font-bold text-lg">NOT ON PROMO</p>
              <p className="text-sm text-gray-400">This account needs to be assigned to a promo.</p>
            </div>
          </div>

          <button
            onClick={() => onAssignPromo(account)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <span className="text-xl">🎯</span>
            <span>Assign to Promo</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ProgressCard
