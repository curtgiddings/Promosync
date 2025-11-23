import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import AddAccountModal from './AddAccountModal'

/**
 * QuickEntry v4 Component - Fixed
 * 
 * Bug fixes:
 * - Only shows accounts that are on active promos
 * - Clear messaging about filtered accounts
 * - Better error handling
 */

const QuickEntry = ({ onSuccess, preSelectedAccount = null }) => {
  const { user } = useAuth()
  
  // Data from database
  const [accounts, setAccounts] = useState([])
  const [accountsOnPromos, setAccountsOnPromos] = useState([]) // NEW: filtered list
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form fields
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedPromo, setSelectedPromo] = useState(null)
  const [accountPromoInfo, setAccountPromoInfo] = useState(null)
  const [units, setUnits] = useState('')
  const [notes, setNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // UI states
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showAddAccount, setShowAddAccount] = useState(false)

  // Fetch accounts and promos when component loads
  useEffect(() => {
    fetchData()
  }, [])

  // Pre-select account if provided
  useEffect(() => {
    if (preSelectedAccount && accountsOnPromos.length > 0) {
      const account = accountsOnPromos.find(a => a.id === preSelectedAccount.id)
      if (account) {
        handleAccountChange({ 
          value: account.id, 
          label: `${account.account_name} - ${account.territory}`,
          account: account
        })
      }
    }
  }, [preSelectedAccount, accountsOnPromos])

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

      // NEW: Filter accounts to only those on promos
      await filterAccountsOnPromos(accountsData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage({ type: 'error', text: 'Failed to load accounts and promos' })
    } finally {
      setLoading(false)
    }
  }

  // NEW: Filter accounts to only show those on active promos
  const filterAccountsOnPromos = async (allAccounts) => {
    try {
      const { data: accountPromos, error } = await supabase
        .from('account_promos')
        .select('account_id')

      if (error) throw error

      // Get unique account IDs that have promos
      const accountIdsWithPromos = [...new Set(accountPromos.map(ap => ap.account_id))]

      // Filter accounts to only those with promos
      const filtered = allAccounts.filter(account => 
        accountIdsWithPromos.includes(account.id)
      )

      setAccountsOnPromos(filtered)
    } catch (error) {
      console.error('Error filtering accounts:', error)
      setAccountsOnPromos(allAccounts) // Fallback to showing all
    }
  }

  // When account is selected, auto-fill promo
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
            promo_code,
            discount
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
          label: `${accountPromo.promos.promo_name} (${accountPromo.promos.discount}%)`,
          promo: accountPromo.promos
        })
        setMessage({ 
          type: 'info', 
          text: `✓ Auto-filled: This account is on ${accountPromo.promos.promo_name}` 
        })
      } else {
        // This shouldn't happen since we filtered, but just in case
        setAccountPromoInfo(null)
        setSelectedPromo(null)
        setMessage({ 
          type: 'error', 
          text: '⚠️ This account is not assigned to a promo. Please assign it first.' 
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

  // Format accounts for react-select dropdown
  const accountOptions = accountsOnPromos.map(account => ({
    value: account.id,
    label: `${account.account_name} - ${account.territory}`,
    account: account
  }))

  // Format promos for react-select dropdown
  const promoOptions = promos.map(promo => ({
    value: promo.id,
    label: `${promo.promo_name} (${promo.promo_code})`,
    promo: promo
  }))

  // Custom styles for react-select (dark theme)
  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: 'rgb(55, 65, 81)',
      borderColor: 'rgb(75, 85, 99)',
      '&:hover': {
        borderColor: 'rgb(107, 114, 128)'
      }
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'rgb(55, 65, 81)',
      border: '1px solid rgb(75, 85, 99)'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'rgb(75, 85, 99)' : 'rgb(55, 65, 81)',
      color: 'white',
      '&:active': {
        backgroundColor: 'rgb(107, 114, 128)'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: 'white'
    }),
    input: (base) => ({
      ...base,
      color: 'white'
    }),
    placeholder: (base) => ({
      ...base,
      color: 'rgb(156, 163, 175)'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="text-gray-400 mt-2">Loading accounts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info Message - NEW */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <span className="text-blue-400 text-lg">ℹ️</span>
          <div className="flex-1">
            <p className="text-blue-300 text-sm font-medium">
              Only accounts on active promos are shown
            </p>
            <p className="text-blue-400/70 text-xs mt-1">
              {accountsOnPromos.length} of {accounts.length} accounts available. To log units for other accounts, assign them to a promo first.
            </p>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/10 border border-green-500 text-green-400' :
          message.type === 'error' ? 'bg-red-500/10 border border-red-500 text-red-400' :
          message.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500 text-yellow-400' :
          'bg-blue-500/10 border border-blue-500 text-blue-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Account <span className="text-red-500">*</span>
          </label>
          <Select
            options={accountOptions}
            value={selectedAccount}
            onChange={handleAccountChange}
            styles={selectStyles}
            placeholder="Search and select account..."
            isClearable
            isSearchable
            noOptionsMessage={() => "No accounts on promos found"}
          />
          {accountsOnPromos.length === 0 && (
            <p className="mt-2 text-sm text-yellow-400">
              ⚠️ No accounts are assigned to promos yet. Please assign accounts to promos first.
            </p>
          )}
        </div>

        {/* Promo Selection (Auto-filled, but can be changed) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Promo <span className="text-red-500">*</span>
          </label>
          <Select
            options={promoOptions}
            value={selectedPromo}
            onChange={setSelectedPromo}
            styles={selectStyles}
            placeholder="Select promo..."
            isClearable
            isSearchable
            isDisabled={!selectedAccount}
          />
          <p className="mt-2 text-sm text-gray-400">
            {selectedAccount ? 'Auto-filled based on account assignment' : 'Select an account first'}
          </p>
        </div>

        {/* Units Input */}
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

        {/* Notes (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes <span className="text-gray-500">(Optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Add any notes about this transaction..."
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !selectedAccount || !selectedPromo || !units}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-lg"
        >
          {submitting ? 'Logging...' : 'Log Units'}
        </button>
      </form>

      {/* Helper text */}
      <div className="text-center pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          💡 Need to add an account to a promo? Go to the account card and click "Assign to Promo"
        </p>
      </div>

      {/* Add Account Modal */}
      {showAddAccount && (
        <AddAccountModal
          accountName={searchTerm}
          onClose={() => setShowAddAccount(false)}
          onSuccess={(newAccount) => {
            fetchData()
            setShowAddAccount(false)
          }}
        />
      )}
    </div>
  )
}

export default QuickEntry
