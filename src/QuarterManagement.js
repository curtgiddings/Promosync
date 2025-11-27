import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * QuarterManagement Component (Admin Only)
 * 
 * Features:
 * - View all quarters
 * - Set active quarter
 * - End quarter (archive results)
 * - View quarter stats
 */

const QuarterManagement = ({ onClose }) => {
  const [quarters, setQuarters] = useState([])
  const [activeQuarter, setActiveQuarter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEndQuarterConfirm, setShowEndQuarterConfirm] = useState(false)
  const [quarterStats, setQuarterStats] = useState(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchQuarters()
  }, [])

  const fetchQuarters = async () => {
    try {
      const { data, error } = await supabase
        .from('quarters')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) throw error
      
      setQuarters(data || [])
      setActiveQuarter(data?.find(q => q.is_active) || null)
      
      if (data?.find(q => q.is_active)) {
        await fetchQuarterStats(data.find(q => q.is_active).id)
      }
    } catch (error) {
      console.error('Error fetching quarters:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuarterStats = async (quarterId) => {
    try {
      // Get accounts on promos for this quarter
      const { data: accountPromos, error: promoError } = await supabase
        .from('account_promos')
        .select(`
          id,
          target_units,
          account_id,
          accounts (account_name, territory)
        `)
        .eq('quarter_id', quarterId)

      if (promoError && promoError.code !== 'PGRST116') throw promoError

      // Get all transactions for these accounts
      const accountIds = accountPromos?.map(ap => ap.account_id) || []
      
      let totalTarget = 0
      let totalSold = 0
      let accountsMet = 0
      let accountsBehind = 0

      if (accountIds.length > 0) {
        const { data: transactions } = await supabase
          .from('transactions')
          .select('account_id, units_sold')
          .in('account_id', accountIds)

        // Calculate stats per account
        const soldByAccount = {}
        transactions?.forEach(t => {
          soldByAccount[t.account_id] = (soldByAccount[t.account_id] || 0) + t.units_sold
        })

        accountPromos?.forEach(ap => {
          totalTarget += ap.target_units || 0
          const sold = soldByAccount[ap.account_id] || 0
          totalSold += sold
          
          const progress = ap.target_units ? (sold / ap.target_units) * 100 : 0
          if (progress >= 100) accountsMet++
          else if (progress < 75) accountsBehind++
        })
      }

      setQuarterStats({
        totalAccounts: accountPromos?.length || 0,
        totalTarget,
        totalSold,
        accountsMet,
        accountsBehind,
        overallProgress: totalTarget > 0 ? Math.round((totalSold / totalTarget) * 100) : 0
      })
    } catch (error) {
      console.error('Error fetching quarter stats:', error)
    }
  }

  const setActiveQuarterHandler = async (quarterId) => {
    setProcessing(true)
    try {
      // Deactivate all quarters
      await supabase
        .from('quarters')
        .update({ is_active: false })
        .neq('id', '')

      // Activate selected quarter
      await supabase
        .from('quarters')
        .update({ is_active: true })
        .eq('id', quarterId)

      await fetchQuarters()
    } catch (error) {
      console.error('Error setting active quarter:', error)
    } finally {
      setProcessing(false)
    }
  }

  const endQuarter = async () => {
    if (!activeQuarter) return
    
    setProcessing(true)
    try {
      // Find next quarter
      const currentIndex = quarters.findIndex(q => q.id === activeQuarter.id)
      const nextQuarter = quarters[currentIndex + 1]

      if (nextQuarter) {
        // Deactivate current
        await supabase
          .from('quarters')
          .update({ is_active: false })
          .eq('id', activeQuarter.id)

        // Activate next
        await supabase
          .from('quarters')
          .update({ is_active: true })
          .eq('id', nextQuarter.id)

        // Link new account_promos to new quarter (optional - for new assignments)
        // Existing promos stay linked to old quarter for historical tracking
      }

      setShowEndQuarterConfirm(false)
      await fetchQuarters()
    } catch (error) {
      console.error('Error ending quarter:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const getQuarterProgress = (quarter) => {
    const start = new Date(quarter.start_date)
    const end = new Date(quarter.end_date)
    const now = new Date()
    
    const totalDays = (end - start) / (1000 * 60 * 60 * 24)
    const daysPassed = (now - start) / (1000 * 60 * 60 * 24)
    
    return Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading quarters...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full shadow-2xl border border-gray-700/50">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center space-x-2">
              <span>📅</span>
              <span>Quarter Management</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-800"
            >
              ✕
            </button>
          </div>

          {/* Active Quarter Stats */}
          {activeQuarter && quarterStats && (
            <div className="mb-6 p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{activeQuarter.name}</h3>
                  <p className="text-blue-300 text-sm">
                    {new Date(activeQuarter.start_date).toLocaleDateString()} - {new Date(activeQuarter.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-400">{getDaysRemaining(activeQuarter.end_date)}</p>
                  <p className="text-blue-300/70 text-sm">days left</p>
                </div>
              </div>

              {/* Quarter Time Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Quarter Progress</span>
                  <span>{getQuarterProgress(activeQuarter)}% complete</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${getQuarterProgress(activeQuarter)}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-white">{quarterStats.totalAccounts}</p>
                  <p className="text-gray-400 text-xs">Accounts</p>
                </div>
                <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">{quarterStats.accountsMet}</p>
                  <p className="text-gray-400 text-xs">Met Target</p>
                </div>
                <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-red-400">{quarterStats.accountsBehind}</p>
                  <p className="text-gray-400 text-xs">Behind</p>
                </div>
                <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-400">{quarterStats.overallProgress}%</p>
                  <p className="text-gray-400 text-xs">Overall</p>
                </div>
              </div>
            </div>
          )}

          {/* All Quarters List */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">All Quarters</h4>
            {quarters.map((quarter) => (
              <div
                key={quarter.id}
                className={`p-4 rounded-lg border transition-all ${
                  quarter.is_active
                    ? 'bg-green-500/10 border-green-500/50'
                    : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {quarter.is_active && (
                      <span className="text-green-400 text-xl">✓</span>
                    )}
                    <div>
                      <p className="font-medium text-white">{quarter.name}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(quarter.start_date).toLocaleDateString()} - {new Date(quarter.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {!quarter.is_active && (
                    <button
                      onClick={() => setActiveQuarterHandler(quarter.id)}
                      disabled={processing}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                    >
                      Set Active
                    </button>
                  )}
                  {quarter.is_active && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* End Quarter Button */}
          {activeQuarter && (
            <>
              {!showEndQuarterConfirm ? (
                <button
                  onClick={() => setShowEndQuarterConfirm(true)}
                  className="w-full py-3 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/50 text-yellow-400 font-medium rounded-lg transition"
                >
                  End {activeQuarter.name} & Start Next Quarter
                </button>
              ) : (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-300 mb-4">
                    ⚠️ Are you sure you want to end <strong>{activeQuarter.name}</strong>?
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    This will archive current results and start the next quarter. 
                    Existing promo assignments will remain for historical tracking.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowEndQuarterConfirm(false)}
                      className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={endQuarter}
                      disabled={processing}
                      className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition"
                    >
                      {processing ? 'Processing...' : 'End Quarter'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Help Text */}
          <div className="mt-6 pt-4 border-t border-gray-700/50">
            <p className="text-gray-500 text-sm">
              💡 Ending a quarter archives all current promo progress and activates the next quarter. 
              You can view historical data by selecting past quarters.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuarterManagement
