import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * AddAccountModal Component
 * 
 * Allows reps to create new accounts on-the-fly
 * from the QuickEntry search dropdown.
 */

const AddAccountModal = ({ accountName, onClose, onSuccess }) => {
  const [name, setName] = useState(accountName || '')
  const [territory, setTerritory] = useState('')
  const [assignToPromo, setAssignToPromo] = useState(false)
  const [promos, setPromos] = useState([])
  const [selectedPromo, setSelectedPromo] = useState('')
  const [targetUnits, setTargetUnits] = useState('')
  const [terms, setTerms] = useState('')
  const [initialUnits, setInitialUnits] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const territories = ['Richmond', 'Vancouver', 'Kelowna']

  useEffect(() => {
    fetchPromos()
  }, [])

  const fetchPromos = async () => {
    try {
      const { data, error } = await supabase
        .from('promos')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false })

      if (error) throw error
      setPromos(data || [])
      
      // Auto-select first promo if available
      if (data && data.length > 0) {
        setSelectedPromo(data[0].id)
        setTargetUnits(data[0].default_target)
      }
    } catch (err) {
      console.error('Error fetching promos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePromoChange = (e) => {
    const promoId = e.target.value
    setSelectedPromo(promoId)
    
    const promo = promos.find(p => p.id === promoId)
    if (promo) {
      setTargetUnits(promo.default_target)
      if (promo.terms) {
        setTerms(promo.terms)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!name || !territory) {
      setError('Please fill in all required fields')
      return
    }

    if (assignToPromo && (!selectedPromo || !targetUnits)) {
      setError('Please select a promo and enter target units')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Create account
      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({
          account_name: name.trim(),
          territory: territory
        })
        .select()
        .single()

      if (accountError) throw accountError

      // Optionally assign to promo
      if (assignToPromo && selectedPromo) {
        const { error: assignError } = await supabase
          .from('account_promos')
          .insert({
            account_id: newAccount.id,
            promo_id: selectedPromo,
            target_units: parseInt(targetUnits),
            terms: terms || null,
            assigned_date: new Date().toISOString()
          })

        if (assignError) throw assignError

        // Create initial units transaction if provided
        if (initialUnits && parseInt(initialUnits) > 0) {
          await supabase
            .from('transactions')
            .insert({
              account_id: newAccount.id,
              units_sold: parseInt(initialUnits),
              notes: 'Initial units on promo assignment'
            })
        }
      }

      // Success!
      onSuccess(newAccount)
      onClose()
    } catch (err) {
      console.error('Error creating account:', err)
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span className="text-3xl">🏢</span>
            <span>Add New Account</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter account name"
              required
              autoFocus
            />
          </div>

          {/* Territory */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Territory <span className="text-red-500">*</span>
            </label>
            <select
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select territory...</option>
              {territories.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Assign to Promo Toggle */}
          <div className="border-t border-gray-700 pt-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={assignToPromo}
                onChange={(e) => setAssignToPromo(e.target.checked)}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-300 font-medium">Assign to promo now</span>
            </label>
          </div>

          {/* Promo Selection (if toggled) */}
          {assignToPromo && (
            <div className="space-y-4 bg-gray-700/50 rounded-lg p-4">
              {loading ? (
                <p className="text-gray-400 text-sm">Loading promos...</p>
              ) : (
                <>
                  {/* Promo Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Promo <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedPromo}
                      onChange={handlePromoChange}
                      className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={assignToPromo}
                    >
                      <option value="">Choose a promo...</option>
                      {promos.map((promo) => (
                        <option key={promo.id} value={promo.id}>
                          {promo.promo_name} ({promo.promo_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Units */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Target Units <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={targetUnits}
                      onChange={(e) => setTargetUnits(e.target.value)}
                      min="1"
                      className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter target units"
                      required={assignToPromo}
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
                      className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Log starting units (optional)"
                    />
                    <p className="mt-1 text-xs text-gray-400">Already have units sold? Add them now.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-4 text-sm text-gray-500">
          <p>💡 Tip: You can assign this account to a promo later if needed.</p>
        </div>
      </div>
    </div>
  )
}

export default AddAccountModal
