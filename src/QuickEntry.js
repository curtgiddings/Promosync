import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'

/**
 * QuickEntry v2 Component
 * 
 * Improved version with:
 * - Searchable dropdowns (react-select)
 * - Auto-fills promo based on account selection
 * - Warns if account not on promo
 * - Better UX for logging units
 */

const QuickEntry = ({ onSuccess, preSelectedAccount = null }) => {
  const { user } = useAuth()
  
  // Data from database
  const [accounts, setAccounts] = useState([])
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form fields
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedPromo, setSelectedPromo] = useState(null)
  const [accountPromoInfo, setAccountPromoInfo] = useState(null)
  const [units, setUnits] = useState('')
  const [notes, setNotes] = useState('')
  
  // UI states
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Fetch accounts and promos when component loads
  useEffect(() => {
    fetchData()
  }, [])

  // Pre-select account if provided (from ProgressCard quick log button)
  useEffect(() => {
    if (preSelectedAccount && accounts.length > 0) {
      const account = accounts.find(a => a.id === preSelectedAccount.id)
      if (account) {
        handleAccountChange({ 
          value: account.id, 
          label: `${account.account_name} - ${account.territory}`,
          account: account
        })
      }
    }
  }, [preSelectedAccount, accounts])

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

  // When account is selected, auto-fill promo if assigned
  const handleAccountChange = async (selectedOption) => {
    setSelectedAccount(selectedOption)
    setMessage({ type: '', text: '' })

    if (!selectedOption) {
      setSelectedPromo(null)
      setAccountPromoInfo(null)
      return
    }

    try {
      // Check if account is assigned to a promo
      const { data: accountPromo, error } = await supabase
        .from('account_promos')
        .select(`
          *,
          promos (
            id,
            promo_name,
            promo_code
          )
        `)
        .eq('account_id', selectedOption.value)
        .order('assigned_date', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (accountPromo && accountPromo.promos) {
        // Account is on a promo - auto-fill it
        setAccountPromoInfo(accountPromo)
        setSelectedPromo({
          value: accountPromo.promos.id,
          label: `${accountPromo.promos.promo_name} (${accountPromo.promos.promo_code})`,
          promo: accountPromo.promos
        })
        setMessage({ 
          type: 'info', 
          text: `✓ Auto-filled: This account is on ${accountPromo.promos.promo_name}` 
        })
      } else {
        // Account not on promo - warn user
        setAccountPromoInfo(null)
        setSelectedPromo(null)
        setMessage({ 
          type: 'warning', 
          text: '⚠️ This account is not assigned to a promo. Please select one or assign the account to a promo first.' 
        })
      }
    } catch (error) {
      console.error('Error checking account promo:', error)
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
          account_id: selectedAccount.value,
          promo_id: selectedPromo.value,
          units_sold: parseInt(units),
          transaction_date: new Date().toISOString().split('T')[0],
          notes: notes || null
        })

      if (error) throw error

      // Success!
      setMessage({ 
        type: 'success', 
        text: `✓ Successfully logged ${units} units for ${selectedAccount.label}!` 
      })
      
      // Reset form
      setSelectedAccount(null)
      setSelectedPromo(null)
      setAccountPromoInfo(null)
      setUnits('')
      setNotes('')

      // Call parent callback if provided
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

  // Custom styles for react-select (dark theme)
  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: '#374151',
      borderColor: '#4B5563',
      '&:hover': { borderColor: '#6B7280' },
      boxShadow: 'none',
      minHeight: '48px',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#374151',
      border: '1px solid #4B5563',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? '#4B5563' : '#374151',
      color: '#FFFFFF',
      '&:hover': { backgroundColor: '#4B5563' },
    }),
    singleValue: (base) => ({
      ...base,
      color: '#FFFFFF',
    }),
    input: (base) => ({
      ...base,
      color: '#FFFFFF',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#9CA3AF',
    }),
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

  // Format accounts for react-select
  const accountOptions = accounts.map(account => ({
    value: account.id,
    label: `${account.account_name} - ${account.territory}`,
    account: account
  }))

  // Format promos for react-select
  const promoOptions = promos.map(promo => ({
    value: promo.id,
    label: `${promo.promo_name} (${promo.promo_code})`,
    promo: promo
  }))

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Quick Entry</h2>
      
      {/* Message banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/10 border border-green-500 text-green-500' : 
          message.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500 text-yellow-500' :
          message.type === 'info' ? 'bg-blue-500/10 border border-blue-500 text-blue-500' :
          'bg-red-500/10 border border-red-500 text-red-500'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account search dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Account <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedAccount}
            onChange={handleAccountChange}
            options={accountOptions}
            styles={selectStyles}
            placeholder="Search accounts..."
            isSearchable
            isClearable
          />
        </div>

        {/* Promo dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Promo <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedPromo}
            onChange={setSelectedPromo}
            options={promoOptions}
            styles={selectStyles}
            placeholder="Select a promo..."
            isSearchable
            isClearable
            isDisabled={!selectedAccount}
          />
          
          {accountPromoInfo && (
            <p className="mt-2 text-sm text-blue-400">
              Target: {accountPromoInfo.target_units} units
            </p>
          )}
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
        <p>💡 Start typing to search accounts. Units are logged with today's date.</p>
      </div>
    </div>
  )
}

export default QuickEntry
