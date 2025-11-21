import React, { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'

/**
 * QuickEntry Component
 * 
 * This is the form where reps log units for accounts.
 * It fetches accounts and promos from the database,
 * then inserts a new transaction when submitted.
 */

const QuickEntry = ({ onSuccess }) => {
  const { user } = useAuth()
  
  // Data from database
  const [accounts, setAccounts] = useState([])
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form fields
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedPromo, setSelectedPromo] = useState('')
  const [units, setUnits] = useState('')
  const [notes, setNotes] = useState('')
  
  // UI states
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Fetch accounts and promos when component loads
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch all accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('account_name')

      if (accountsError) throw accountsError

      // Fetch only active promos
      const { data: promosData, error: promosError } = await supabase
        .from('promos')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false })

      if (promosError) throw promosError

      setAccounts(accountsData || [])
      setPromos(promosData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage({ type: 'error', text: 'Failed to load accounts and promos' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!selectedAccount || !selectedPromo || !units) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    if (units <= 0) {
      setMessage({ type: 'error', text: 'Units must be greater than 0' })
      return
    }

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      // Insert transaction into database
      const { error } = await supabase
        .from('transactions')
        .insert({
          rep_id: user.id,
          account_id: selectedAccount,
          promo_id: selectedPromo,
          units_sold: parseInt(units),
          transaction_date: new Date().toISOString().split('T')[0], // Today's date
          notes: notes || null
        })

      if (error) throw error

      // Success!
      setMessage({ 
        type: 'success', 
        text: `Successfully logged ${units} units!` 
      })
      
      // Reset form
      setSelectedAccount('')
      setSelectedPromo('')
      setUnits('')
      setNotes('')

      // Call parent callback if provided (to refresh dashboard)
      if (onSuccess) {
        onSuccess()
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' })
      }, 3000)

    } catch (error) {
      console.error('Error logging units:', error)
      setMessage({ type: 'error', text: 'Failed to log units. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Quick Entry</h2>
      
      {/* Message banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500 text-green-500' 
            : 'bg-red-500/10 border border-red-500 text-red-500'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Account <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select an account...</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name} - {account.territory}
              </option>
            ))}
          </select>
        </div>

        {/* Promo dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Promo <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedPromo}
            onChange={(e) => setSelectedPromo(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a promo...</option>
            {promos.map((promo) => (
              <option key={promo.id} value={promo.id}>
                {promo.promo_name} ({promo.promo_code})
              </option>
            ))}
          </select>
        </div>

        {/* Units input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Units Sold <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            min="1"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter number of units"
            required
          />
        </div>

        {/* Notes (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="2"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any notes about this sale..."
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
        >
          {submitting ? 'Logging...' : 'Log Units'}
        </button>
      </form>

      {/* Help text */}
      <div className="mt-4 text-sm text-gray-400">
        <p>Tip: Units are logged with today's date automatically.</p>
      </div>
    </div>
  )
}

export default QuickEntry
