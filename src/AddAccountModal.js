import { useState } from 'react'
import { supabase } from './supabaseClient'

function AddAccountModal({ onClose, onSuccess }) {
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [territory, setTerritory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const territories = ['Vancouver', 'Richmond', 'Kelowna', 'Victoria', 'Other']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!accountName.trim()) {
      setError('Account name is required')
      return
    }

    // Validate account number if provided
    if (accountNumber && !/^\d{1,7}$/.test(accountNumber)) {
      setError('Account number must be 1-7 digits')
      return
    }

    setLoading(true)

    try {
      const { error: insertError } = await supabase
        .from('accounts')
        .insert({
          account_name: accountName.trim(),
          territory: territory || null,
          account_number: accountNumber || null
        })

      if (insertError) throw insertError

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Error adding account:', err)
      setError(err.message || 'Failed to add account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Add New Account</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-400 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Account Name *
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. Vancouver Eye Care"
              autoFocus
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Account Number
              <span className="text-gray-500 font-normal ml-1">(optional, 7 digits)</span>
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => {
                // Only allow digits, max 7
                const val = e.target.value.replace(/\D/g, '').slice(0, 7)
                setAccountNumber(val)
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              placeholder="1234567"
              maxLength={7}
            />
          </div>

          {/* Territory */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Territory
            </label>
            <select
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select territory...</option>
              {territories.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddAccountModal
