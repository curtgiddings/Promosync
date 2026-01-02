import { useState } from 'react'
import { supabase } from './supabaseClient'

function QuarterReset({ activeQuarter, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  // Step 1: Get current stats
  const fetchStats = async () => {
    setLoading(true)
    try {
      const [accountPromos, transactions, accounts] = await Promise.all([
        supabase.from('account_promos').select('id', { count: 'exact' }),
        supabase.from('transactions').select('id', { count: 'exact' }),
        supabase.from('accounts').select('id', { count: 'exact' })
      ])

      setStats({
        accountPromos: accountPromos.count || 0,
        transactions: transactions.count || 0,
        accounts: accounts.count || 0
      })
      setStep(2)
    } catch (err) {
      setError('Failed to fetch stats')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Archive and reset
  const executeReset = async () => {
    setLoading(true)
    setError('')

    try {
      const quarterName = activeQuarter?.name || 'Unknown Quarter'

      // Archive account_promos
      const { data: accountPromosData } = await supabase
        .from('account_promos')
        .select('*')

      if (accountPromosData && accountPromosData.length > 0) {
        const archivedPromos = accountPromosData.map(ap => ({
          original_id: ap.id,
          account_id: ap.account_id,
          promo_id: ap.promo_id,
          target_units: ap.target_units,
          quarter_name: quarterName
        }))

        await supabase.from('archived_account_promos').insert(archivedPromos)
      }

      // Archive transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')

      if (transactionsData && transactionsData.length > 0) {
        const archivedTransactions = transactionsData.map(t => ({
          original_id: t.id,
          rep_id: t.rep_id,
          account_id: t.account_id,
          promo_id: t.promo_id,
          units_sold: t.units_sold,
          transaction_date: t.transaction_date,
          notes: t.notes,
          quarter_name: quarterName
        }))

        await supabase.from('archived_transactions').insert(archivedTransactions)
      }

      // Clear current data
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('account_promos').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Move to next quarter if available
      if (activeQuarter) {
        // Deactivate current quarter
        await supabase
          .from('quarters')
          .update({ is_active: false })
          .eq('id', activeQuarter.id)

        // Try to activate next quarter
        const { data: nextQuarter } = await supabase
          .from('quarters')
          .select('*')
          .gt('start_date', activeQuarter.end_date)
          .order('start_date', { ascending: true })
          .limit(1)
          .single()

        if (nextQuarter) {
          await supabase
            .from('quarters')
            .update({ is_active: true })
            .eq('id', nextQuarter.id)
        }
      }

      setStep(3)
      if (onSuccess) onSuccess()

    } catch (err) {
      console.error('Reset error:', err)
      setError('Failed to reset quarter. Please try again or contact support.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {step === 1 && '🔄 End Quarter'}
            {step === 2 && '⚠️ Confirm Reset'}
            {step === 3 && '✅ Quarter Ended'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Initial */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-300">
                This will end <span className="font-bold text-white">{activeQuarter?.name || 'the current quarter'}</span> and:
              </p>
              <ul className="text-gray-400 space-y-2 ml-4">
                <li>📦 Archive all promo assignments</li>
                <li>📦 Archive all transaction history</li>
                <li>🧹 Clear accounts from promos (show "Not on promo")</li>
                <li>✅ Keep all accounts in database</li>
                <li>➡️ Activate next quarter</li>
              </ul>
              <p className="text-yellow-400 text-sm">
                ⚠️ This action cannot be undone. Make sure the quarter is complete.
              </p>
            </div>
          )}

          {/* Step 2: Confirm with stats */}
          {step === 2 && stats && (
            <div className="space-y-4">
              <p className="text-gray-300 font-medium">You are about to archive:</p>
              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Promo assignments:</span>
                  <span className="text-white font-bold">{stats.accountPromos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Transactions:</span>
                  <span className="text-white font-bold">{stats.transactions}</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-2 mt-2">
                  <span className="text-gray-400">Accounts (kept):</span>
                  <span className="text-green-400 font-bold">{stats.accounts}</span>
                </div>
              </div>
              <p className="text-red-400 text-sm font-medium">
                Type "END QUARTER" below to confirm:
              </p>
              <input
                type="text"
                id="confirmInput"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="Type END QUARTER"
                onChange={(e) => {
                  if (e.target.value === 'END QUARTER') {
                    document.getElementById('confirmBtn').disabled = false
                  } else {
                    document.getElementById('confirmBtn').disabled = true
                  }
                }}
              />
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <p className="text-white text-lg font-medium">Quarter ended successfully!</p>
              <p className="text-gray-400">
                All data has been archived. Accounts are ready to be assigned to new promos.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex space-x-3">
          {step === 1 && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Continue'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition"
              >
                Back
              </button>
              <button
                id="confirmBtn"
                onClick={executeReset}
                disabled={true}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'End Quarter'}
              </button>
            </>
          )}

          {step === 3 && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuarterReset
