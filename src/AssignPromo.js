import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * AssignPromo Modal
 * 
 * Modal for assigning or changing an account's promo.
 * All reps can use this - not admin-only.
 */

const AssignPromo = ({ account, currentPromo, onClose, onSuccess }) => {
  const [promos, setPromos] = useState([])
  const [selectedPromo, setSelectedPromo] = useState('')
  const [targetUnits, setTargetUnits] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPromos()
    
    // Pre-fill if editing existing promo
    if (currentPromo) {
      setSelectedPromo(currentPromo.promo_id)
      setTargetUnits(currentPromo.target_units)
    }
  }, [currentPromo])

  const fetchPromos = async () => {
    try {
      const { data, error } = await supabase
        .from('promos')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false })

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
          })

        if (insertError) throw insertError
      }

      // Success!
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
    
    // Auto-fill default target if available
    const selectedPromoData = promos.find(p => p.id === promoId)
    if (selectedPromoData && !targetUnits) {
      setTargetUnits(selectedPromoData.default_target)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {currentPromo ? 'Change Promo' : 'Assign Promo'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Account Info */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">Account</p>
          <p className="text-lg font-semibold text-white">{account.account_name}</p>
          <p className="text-sm text-gray-400">{account.territory}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
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
                Select Promo <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPromo}
                onChange={handlePromoChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose a promo...</option>
                {promos.map((promo) => (
                  <option key={promo.id} value={promo.id}>
                    {promo.promo_name} ({promo.promo_code})
                  </option>
                ))}
              </select>
              
              {/* Show promo details */}
              {selectedPromo && (
                <div className="mt-2 text-sm text-gray-400">
                  {(() => {
                    const promo = promos.find(p => p.id === selectedPromo)
                    return promo ? (
                      <p>
                        {new Date(promo.start_date).toLocaleDateString()} - {new Date(promo.end_date).toLocaleDateString()}
                        {promo.terms && ` • ${promo.terms}`}
                      </p>
                    ) : null
                  })()}
                </div>
              )}
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
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter target units"
                required
              />
              <p className="mt-2 text-sm text-gray-400">
                How many units should this account sell for this promo?
              </p>
            </div>

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
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                {submitting ? 'Saving...' : currentPromo ? 'Update Promo' : 'Assign Promo'}
              </button>
            </div>
          </form>
        )}

        {/* Help Text */}
        <div className="mt-4 text-sm text-gray-500">
          <p>💡 Tip: Any rep can assign or change promos for accounts.</p>
        </div>
      </div>
    </div>
  )
}

export default AssignPromo
