import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

/**
 * AssignPromo Modal
 * 
 * Modal for assigning or changing an account's promo.
 * Now with:
 * - Territory editing (multi-select)
 * - Duplicate prevention
 */

const AssignPromo = ({ account, currentPromo, onClose, onSuccess }) => {
  const { user } = useAuth()
  const [promos, setPromos] = useState([])
  const [selectedPromo, setSelectedPromo] = useState('')
  const [targetUnits, setTargetUnits] = useState('')
  const [terms, setTerms] = useState('')
  const [initialUnits, setInitialUnits] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Territory editing
  const [territories, setTerritories] = useState([])
  const [selectedTerritories, setSelectedTerritories] = useState([])
  const [showTerritoryDropdown, setShowTerritoryDropdown] = useState(false)

  useEffect(() => {
    fetchPromos()
    fetchTerritories()
    
    // Pre-fill if editing existing promo (passed from parent)
    if (currentPromo) {
      setSelectedPromo(currentPromo.promo_id || currentPromo.promos?.id)
      setTargetUnits(currentPromo.target_units)
      setTerms(currentPromo.terms || '30/60/90/120')
    }
    
    // Pre-fill territories from account
    if (account?.territory) {
      const existingTerritories = account.territory.split(',').map(t => t.trim()).filter(Boolean)
      setSelectedTerritories(existingTerritories)
    }
  }, [currentPromo, account])

  const fetchTerritories = async () => {
    try {
      const { data } = await supabase
        .from('accounts')
        .select('territory')
        .not('territory', 'is', null)
      
      // Get unique territories (splitting any comma-separated ones)
      const allTerritories = []
      data?.forEach(a => {
        if (a.territory) {
          a.territory.split(',').forEach(t => {
            const trimmed = t.trim()
            if (trimmed && !allTerritories.includes(trimmed)) {
              allTerritories.push(trimmed)
            }
          })
        }
      })
      setTerritories(allTerritories.sort())
    } catch (err) {
      console.error('Error fetching territories:', err)
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
      // Update account territory if changed
      const newTerritory = selectedTerritories.length > 0 ? selectedTerritories.join(', ') : null
      if (newTerritory !== account.territory) {
        const { error: territoryError } = await supabase
          .from('accounts')
          .update({ territory: newTerritory })
          .eq('id', account.id)
        
        if (territoryError) throw territoryError
      }

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
        // Activity logging is optional
      }

      // Send email notification (only for NEW assignments)
      if (!currentPromo) {
        try {
          await fetch('/api/notify-promo-assigned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: account.id,
              accountName: account.account_name,
              territory: newTerritory,
              promoName: promos.find(p => p.id === selectedPromo)?.promo_name,
              targetUnits: parseInt(targetUnits),
              terms: terms || null,
              assignedBy: user?.name || user?.email || 'Unknown'
            })
          })
        } catch (e) {
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
      setError('Failed to save changes. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePromoChange = (e) => {
    const promoId = e.target.value
    setSelectedPromo(promoId)
    
    const selectedPromoData = promos.find(p => String(p.id) === String(promoId))
    if (selectedPromoData) {
      const match = selectedPromoData.promo_name.match(/\d+/)
      if (match && !targetUnits) {
        setTargetUnits(match[0])
      }
      setTerms(selectedPromoData.terms || '')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full shadow-2xl border border-gray-700/50 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
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
                <p className="text-sm text-gray-400">📍 {selectedTerritories.length > 0 ? selectedTerritories.join(', ') : 'No territory'}</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg">
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
              {/* Territory Multi-Select */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Territory/Territories
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTerritoryDropdown(!showTerritoryDropdown)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-left text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
                  >
                    <span className={selectedTerritories.length === 0 ? 'text-gray-500' : ''}>
                      {selectedTerritories.length === 0 
                        ? 'Select territories...' 
                        : `${selectedTerritories.length} selected`}
                    </span>
                    <span className="text-gray-400">{showTerritoryDropdown ? '▲' : '▼'}</span>
                  </button>
                  
                  {showTerritoryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {territories.map(t => (
                        <label
                          key={t}
                          className="flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTerritories.includes(t)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTerritories([...selectedTerritories, t])
                              } else {
                                setSelectedTerritories(selectedTerritories.filter(x => x !== t))
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                          />
                          <span className="ml-3 text-white">{t}</span>
                        </label>
                      ))}
                      {territories.length === 0 && (
                        <p className="px-4 py-2 text-gray-500 text-sm">No territories found</p>
                      )}
                    </div>
                  )}
                </div>
                {selectedTerritories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedTerritories.map(t => (
                      <span 
                        key={t}
                        className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => setSelectedTerritories(selectedTerritories.filter(x => x !== t))}
                          className="ml-1 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

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
                    currentPromo ? 'Update' : 'Assign Promo'
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
