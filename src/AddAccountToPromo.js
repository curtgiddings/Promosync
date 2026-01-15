import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

/**
 * AddAccountToPromo Component - Combined Flow v2
 * 
 * Single modal: Search account → Select OR Create New → Assign promo (all in one)
 */

const AddAccountToPromo = ({ onClose, onSuccess, onAddNew }) => {
  const { user } = useAuth()
  
  // Step tracking: 1 = search, 2 = assign (existing), 3 = create new + assign
  const [step, setStep] = useState(1)
  
  // Account search
  const [searchTerm, setSearchTerm] = useState('')
  const [allAccounts, setAllAccounts] = useState([])
  const [accountPromoStatus, setAccountPromoStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [filteredAccounts, setFilteredAccounts] = useState([])
  
  // Selected account (for existing accounts)
  const [selectedAccount, setSelectedAccount] = useState(null)
  
  // New account fields
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountNumber, setNewAccountNumber] = useState('')
  const [newTerritory, setNewTerritory] = useState('')
  const [territories, setTerritories] = useState([])
  
  // Promo assignment
  const [promos, setPromos] = useState([])
  const [selectedPromo, setSelectedPromo] = useState('')
  const [targetUnits, setTargetUnits] = useState('')
  const [terms, setTerms] = useState('')
  const [initialUnits, setInitialUnits] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAllAccounts()
    fetchPromos()
    fetchTerritories()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAccounts(allAccounts.slice(0, 50))
    } else {
      const filtered = allAccounts.filter(account => 
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.territory?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredAccounts(filtered.slice(0, 50))
    }
  }, [searchTerm, allAccounts])

  const fetchTerritories = async () => {
    try {
      const { data } = await supabase
        .from('accounts')
        .select('territory')
        .not('territory', 'is', null)
      
      const uniqueTerritories = [...new Set(data?.map(a => a.territory).filter(Boolean))]
      setTerritories(uniqueTerritories.sort())
    } catch (err) {
      console.error('Error fetching territories:', err)
    }
  }

  const fetchAllAccounts = async () => {
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('account_name')

      if (accountsError) throw accountsError

      const { data: accountPromos, error: promosError } = await supabase
        .from('account_promos')
        .select(`
          account_id,
          target_units,
          terms,
          promos (
            promo_name,
            discount
          )
        `)

      if (promosError) throw promosError

      const promoStatusMap = {}
      accountPromos?.forEach(ap => {
        promoStatusMap[ap.account_id] = {
          hasPromo: true,
          promoName: ap.promos?.promo_name,
          discount: ap.promos?.discount,
          target: ap.target_units,
          terms: ap.terms
        }
      })

      setAllAccounts(accountsData || [])
      setAccountPromoStatus(promoStatusMap)
      setFilteredAccounts((accountsData || []).slice(0, 50))
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPromos = async () => {
    try {
      const { data, error } = await supabase
        .from('promos')
        .select('*')
        .eq('is_active', true)
        .order('promo_name', { ascending: true })

      if (error) throw error
      setPromos(data || [])
    } catch (err) {
      console.error('Error fetching promos:', err)
    }
  }

  const handleSelectAccount = (account) => {
    const status = accountPromoStatus[account.id]
    if (status?.hasPromo) {
      return
    }
    setSelectedAccount(account)
    setStep(2)
  }

  const handleAddNewAccount = () => {
    setNewAccountName(searchTerm)
    setStep(3)
  }

  const handlePromoChange = (e) => {
    const promoId = e.target.value
    setSelectedPromo(promoId)
    
    const selectedPromoData = promos.find(p => p.id === promoId)
    if (selectedPromoData) {
      const match = selectedPromoData.promo_name.match(/\d+/)
      if (match && !targetUnits) {
        setTargetUnits(match[0])
      }
      if (selectedPromoData.terms) {
        setTerms(selectedPromoData.terms)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedPromo || !targetUnits) {
      setError('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      let accountId = selectedAccount?.id
      let accountName = selectedAccount?.account_name

      // If step 3, create the new account first
      if (step === 3) {
        if (!newAccountName.trim()) {
          setError('Account name is required')
          setSubmitting(false)
          return
        }

        const { data: newAccount, error: createError } = await supabase
          .from('accounts')
          .insert({
            account_name: newAccountName.trim(),
            account_number: newAccountNumber || null,
            territory: newTerritory || null
          })
          .select()
          .single()

        if (createError) throw createError

        accountId = newAccount.id
        accountName = newAccount.account_name

        // Log account creation
        try {
          await supabase
            .from('activity_log')
            .insert({
              action_type: 'account_created',
              account_id: accountId,
              rep_id: user?.id,
              details: { account_name: accountName }
            })
        } catch (e) {}
      }

      // Create promo assignment
      const { error: insertError } = await supabase
        .from('account_promos')
        .insert({
          account_id: accountId,
          promo_id: selectedPromo,
          target_units: parseInt(targetUnits),
          terms: terms,
          assigned_date: new Date().toISOString()
        })

      if (insertError) throw insertError

      // Log activity
      try {
        await supabase
          .from('activity_log')
          .insert({
            action_type: 'promo_assigned',
            account_id: accountId,
            rep_id: user?.id,
            details: { 
              promo_name: promos.find(p => p.id === selectedPromo)?.promo_name,
              target_units: parseInt(targetUnits)
            }
          })
      } catch (e) {}

      // Send email notification
      try {
        await fetch('/api/notify-promo-assigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: accountId,
            accountName: accountName,
            territory: step === 3 ? newTerritory : selectedAccount?.territory,
            promoName: promos.find(p => p.id === selectedPromo)?.promo_name,
            targetUnits: parseInt(targetUnits),
            terms: terms || null,
            assignedBy: user?.name || user?.email || 'Unknown'
          })
        })
      } catch (e) {}

      // Create initial units transaction if provided
      if (initialUnits && parseInt(initialUnits) > 0) {
        try {
          await supabase
            .from('transactions')
            .insert({
              account_id: accountId,
              promo_id: selectedPromo,
              units_sold: parseInt(initialUnits),
              rep_id: user?.id,
              notes: 'Initial units on promo assignment'
            })

          await supabase
            .from('activity_log')
            .insert({
              action_type: 'units_logged',
              account_id: accountId,
              rep_id: user?.id,
              details: { 
                units: parseInt(initialUnits),
                note: 'Initial units on promo assignment'
              }
            })
        } catch (e) {}
      }

      onSuccess && onSuccess()
      onClose()
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    setStep(1)
    setSelectedAccount(null)
    setNewAccountName('')
    setNewAccountNumber('')
    setNewTerritory('')
    setSelectedPromo('')
    setTargetUnits('')
    setTerms('')
    setInitialUnits('')
    setError('')
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-lg w-full shadow-2xl border border-gray-700/50 max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="text-gray-400 hover:text-white transition p-1"
                >
                  ←
                </button>
              )}
              <h2 className="text-2xl font-semibold text-white">
                {step === 1 ? 'Add to Promo' : step === 2 ? 'Assign Promo' : 'New Account + Promo'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: Account Search */}
          {step === 1 && (
            <>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search by account name or territory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-2 block">🔍</span>
                  <p className="text-gray-400 mb-4">No accounts found</p>
                  {searchTerm && (
                    <button
                      onClick={handleAddNewAccount}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      ➕ Add "{searchTerm}" as new account
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAccounts.map(account => {
                    const status = accountPromoStatus[account.id]
                    const hasPromo = status?.hasPromo
                    
                    return (
                      <div
                        key={account.id}
                        onClick={() => !hasPromo && handleSelectAccount(account)}
                        className={`p-4 rounded-lg border transition-all ${
                          hasPromo 
                            ? 'bg-gray-800/30 border-gray-700/30 opacity-60 cursor-not-allowed'
                            : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800 hover:border-blue-500/50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">🏢</span>
                            <div>
                              <h3 className="text-white font-semibold">{account.account_name}</h3>
                              <p className="text-gray-400 text-sm">📍 {account.territory || 'No territory'}</p>
                            </div>
                          </div>
                          {hasPromo ? (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                              ✓ {status.promoName}
                            </span>
                          ) : (
                            <span className="text-blue-400 text-sm">Select →</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Add new option at bottom of results */}
                  {searchTerm && (
                    <div
                      onClick={handleAddNewAccount}
                      className="p-4 rounded-lg border border-dashed border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">➕</span>
                        <div>
                          <h3 className="text-blue-400 font-semibold">Add "{searchTerm}" as new account</h3>
                          <p className="text-gray-500 text-sm">Create and assign to promo in one step</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-center text-gray-500 text-xs mt-4">
                Showing {filteredAccounts.length} accounts • Accounts already on promos are disabled
              </p>
            </>
          )}

          {/* STEP 2: Assign Promo to Existing Account */}
          {step === 2 && selectedAccount && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selected Account */}
              <div className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🏢</span>
                  <div>
                    <p className="text-lg font-semibold text-white">{selectedAccount.account_name}</p>
                    <p className="text-sm text-gray-400">📍 {selectedAccount.territory || 'No territory'}</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              {/* Promo Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Promo <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedPromo}
                  onChange={handlePromoChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a promo...</option>
                  {promos.map((promo) => (
                    <option key={promo.id} value={promo.id}>
                      {promo.promo_name} {promo.discount ? `- ${promo.discount}% off` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Units */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Units <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={targetUnits}
                  onChange={(e) => setTargetUnits(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter target units"
                  required
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Terms
                </label>
                <select
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No terms</option>
                  <option value="30/60/90">30/60/90</option>
                  <option value="30/60/90/120">30/60/90/120</option>
                  <option value="30/60/90/120/150">30/60/90/120/150</option>
                </select>
              </div>

              {/* Initial Units */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initial Units <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  value={initialUnits}
                  onChange={(e) => setInitialUnits(e.target.value)}
                  min="0"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Log starting units (optional)"
                />
                <p className="mt-1 text-xs text-gray-500">Already have units sold? Add them now.</p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg shadow-blue-600/30"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center space-x-2">
                      <span className="animate-spin">⏳</span>
                      <span>Saving...</span>
                    </span>
                  ) : (
                    'Assign Promo'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Create New Account + Assign Promo */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              {/* Section: Account Info */}
              <div className="pb-2 border-b border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Account Info</h3>
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Vancouver Eye Care"
                  required
                  autoFocus
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Number <span className="text-gray-500">(optional, 7 digits)</span>
                </label>
                <input
                  type="text"
                  value={newAccountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 7)
                    setNewAccountNumber(val)
                  }}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1234567"
                  maxLength={7}
                />
              </div>

              {/* Territory */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Territory
                </label>
                <select
                  value={newTerritory}
                  onChange={(e) => setNewTerritory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select territory...</option>
                  {territories.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Section: Promo Info */}
              <div className="pt-4 pb-2 border-b border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Promo Assignment</h3>
              </div>

              {/* Promo Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Promo <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedPromo}
                  onChange={handlePromoChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a promo...</option>
                  {promos.map((promo) => (
                    <option key={promo.id} value={promo.id}>
                      {promo.promo_name} {promo.discount ? `- ${promo.discount}% off` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Units */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Units <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={targetUnits}
                  onChange={(e) => setTargetUnits(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter target units"
                  required
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Terms
                </label>
                <select
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No terms</option>
                  <option value="30/60/90">30/60/90</option>
                  <option value="30/60/90/120">30/60/90/120</option>
                  <option value="30/60/90/120/150">30/60/90/120/150</option>
                </select>
              </div>

              {/* Initial Units */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initial Units <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  value={initialUnits}
                  onChange={(e) => setInitialUnits(e.target.value)}
                  min="0"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Log starting units (optional)"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg shadow-green-600/30"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center space-x-2">
                      <span className="animate-spin">⏳</span>
                      <span>Saving...</span>
                    </span>
                  ) : (
                    'Add Account & Assign'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddAccountToPromo
