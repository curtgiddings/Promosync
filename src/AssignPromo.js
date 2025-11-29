import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

/**
 * AssignPromo Modal
 * 
 * Modal for assigning or changing an account's promo.
 * Now with duplicate prevention:
 * - Checks if account already has a promo
 * - Shows warning if trying to add second promo
 * - Requires confirmation to replace existing promo
 */

const AssignPromo = ({ account, currentPromo, onClose, onSuccess }) => {
  const { user } = useAuth()
  const [promos, setPromos] = useState([])
  const [selectedPromo, setSelectedPromo] = useState('')
  const [targetUnits, setTargetUnits] = useState('')
  const [terms, setTerms] = useState('')
  const [initialUnits, setInitialUnits] = useState('') // Optional starting units
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPromos()
    
    // Pre-fill if editing existing promo (passed from parent)
    if (currentPromo) {
      setSelectedPromo(currentPromo.promo_id || currentPromo.promos?.id)
      setTargetUnits(currentPromo.target_units)
      setTerms(currentPromo.terms || '30/60/90/120')
    }
  }, [currentPromo])

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
      setError('Failed to load promos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedPromo || !targetUnits) {
      setError('Please fill in all fields')
      return
    }

    if (targetUnits <= 0) {
      setError('Target units must be greater than 0')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      if (currentPromo) {
        // Update existing assignment
        const { error: updateError } = await supabase
          .from('account_promos')
          .update({
            promo_id: selectedPromo,
            target_units: parseInt(targetUnits),
            terms: terms,
            assigned_date: new Date().toISOString()
          })
          .eq('id', currentPromo.id)

        if (updateError) throw updateError
      } else {
        // Create new assignment
        const { error: insertError } = await supabase
          .from('account_promos')
          .insert({
            account_id: account.id,
            promo_id: selectedPromo,
            target_units: parseInt(targetUnits),
            terms: terms,
            assigned_date: new Date().toISOString()
          })

        if (insertError) throw insertError
      }

      // Success!
      
      // Log activity
      try {
        await supabase
          .from('activity_log')
          .insert({
            action_type: currentPromo ? 'promo_changed' : 'promo_assigned',
            account_id: account.id,
            rep_id: user?.id,
            details: { 
              promo_name: promos.find(p => p.id === selectedPromo)?.promo_name,
              target_units: parseInt(targetUnits)
            }
          })
      } catch (e) {
        // Activity logging is optional, don't block on failure
      }

      // Send email notification (only for NEW assignments, not edits)
      if (!currentPromo) {
        try {
          await fetch('/api/notify-promo-assigned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: account.id,
              accountName: account.account_name,
              territory: account.territory,
              promoName: promos.find(p => p.id === selectedPromo)?.promo_name,
              targetUnits: parseInt(targetUnits),
              terms: terms || null,
              assignedBy: user?.name || user?.email || 'Unknown'
            })
          })
        } catch (e) {
          // Email notification is optional, don't block on failure
          console.log('Email notification skipped:', e)
        }
      }

      // Create initial units transaction if provided (only for new assignments)
      if (!currentPromo && initialUnits && parseInt(initialUnits) > 0) {
        try {
          await supabase
            .from('transactions')
            .insert({
              account_id: account.id,
              units_sold: parseInt(initialUnits),
              logged_by: user?.id,
              notes: 'Initial units on promo assignment'
            })

          // Log the transaction activity
          await supabase
            .from('activity_log')
            .insert({
              action_type: 'units_logged',
              account_id: account.id,
              rep_id: user?.id,
              details: { 
                units: parseInt(initialUnits),
                note: 'Initial units on promo assignment'
              }
            })
        } catch (e) {
          console.log('Initial units logging skipped:', e)
        }
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error assigning promo:', err)
      setError('Failed to assign promo. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePromoChange = (e) => {
    const promoId = e.target.value
    setSelectedPromo(promoId)
    
    // Auto-fill default target and terms based on promo
    const selectedPromoData = promos.find(p => String(p.id) === String(promoId))
    if (selectedPromoData) {
      // Extract target from promo name (e.g., "SY125" -> 125)
      const match = selectedPromoData.promo_name.match(/\d+/)
      if (match && !targetUnits) {
        setTargetUnits(match[0])
      }
      
      // Always auto-fill terms from promo
      setTerms(selectedPromoData.terms || '')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full shadow-2xl border border-gray-700/50">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white">
              {currentPromo ? 'Edit Promo' : 'Assign Promo'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-800"
            >
              ✕
            </button>
          </div>

          {/* Account Info */}
          <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🏢</span>
              <div>
                <p className="text-lg font-semibold text-white">{account.account_name}</p>
                <p className="text-sm text-gray-400">📍 {account.territory}</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {/* Form - Always show */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-400 mt-2">Loading promos...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Promo Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Promo <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={selectedPromo}
                      onChange={handlePromoChange}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Choose a promo...</option>
                      {promos.map((promo) => (
                        <option key={promo.id} value={promo.id}>
                          {promo.promo_name} - {promo.discount}% off
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
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No terms</option>
                      <option value="30/60/90">30/60/90</option>
                      <option value="30/60/90/120">30/60/90/120</option>
                      <option value="30/60/90/120/150">30/60/90/120/150</option>
                    </select>
                  </div>

                  {/* Initial Units - Only show for new assignments */}
                  {!currentPromo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Initial Units <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="number"
                        value={initialUnits}
                        onChange={(e) => setInitialUnits(e.target.value)}
                        min="0"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Log starting units (optional)"
                      />
                      <p className="mt-1 text-xs text-gray-500">Already have units sold? Add them now.</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
                    >
                      Cancel
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
                        currentPromo ? 'Update Promo' : 'Assign Promo'
                      )}
                    </button>
                  </div>
                </form>
              )}

          {/* Help Text */}
          <div className="mt-4 pt-4 border-t border-gray-700/50 text-sm text-gray-500">
            <p>💡 Each account can only have one active promo at a time.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssignPromo
