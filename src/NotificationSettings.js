import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

/**
 * NotificationSettings Component
 * 
 * Allows reps to opt-in/out of email notifications:
 * - Weekly summary (every Monday)
 * - Territory promo alerts (when account in their territory added to promo)
 */

const NotificationSettings = ({ onClose }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    email: '',
    notify_weekly_summary: false,
    notify_territory_promos: false,
    territories: []
  })
  const [allTerritories, setAllTerritories] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchSettings()
    fetchTerritories()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('reps')
        .select('email, notify_weekly_summary, notify_territory_promos, territories')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setSettings({
        email: data.email || '',
        notify_weekly_summary: data.notify_weekly_summary || false,
        notify_territory_promos: data.notify_territory_promos || false,
        territories: data.territories || []
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTerritories = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('territory')
        .not('territory', 'is', null)

      if (error) throw error

      // Get unique territories
      const unique = [...new Set(data.map(a => a.territory).filter(Boolean))]
      setAllTerritories(unique.sort())
    } catch (error) {
      console.error('Error fetching territories:', error)
    }
  }

  const handleSave = async () => {
    // Validate email if notifications are enabled
    if ((settings.notify_weekly_summary || settings.notify_territory_promos) && !settings.email) {
      setMessage({ type: 'error', text: 'Please enter your email address to receive notifications' })
      return
    }

    // Validate email format
    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('reps')
        .update({
          email: settings.email || null,
          notify_weekly_summary: settings.notify_weekly_summary,
          notify_territory_promos: settings.notify_territory_promos,
          territories: settings.territories
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      
      // Close after brief delay
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const toggleTerritory = (territory) => {
    setSettings(prev => ({
      ...prev,
      territories: prev.territories.includes(territory)
        ? prev.territories.filter(t => t !== territory)
        : [...prev.territories, territory]
    }))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-xl max-w-lg w-full shadow-2xl border border-gray-700/50">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center space-x-2">
              <span>🔔</span>
              <span>Notification Settings</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-800"
            >
              ✕
            </button>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/50 text-green-400' 
                : 'bg-red-500/10 border border-red-500/50 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          {/* Email Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notification Options */}
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Email Notifications
            </h3>

            {/* Weekly Summary */}
            <label className="flex items-start space-x-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 cursor-pointer hover:bg-gray-800 transition">
              <input
                type="checkbox"
                checked={settings.notify_weekly_summary}
                onChange={(e) => setSettings({ ...settings, notify_weekly_summary: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div>
                <p className="font-medium text-white">Weekly Summary</p>
                <p className="text-sm text-gray-400 mt-1">
                  Receive a summary email every Monday with your territory stats, 
                  accounts behind pace, and targets met.
                </p>
              </div>
            </label>

            {/* Territory Promo Alerts */}
            <label className="flex items-start space-x-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 cursor-pointer hover:bg-gray-800 transition">
              <input
                type="checkbox"
                checked={settings.notify_territory_promos}
                onChange={(e) => setSettings({ ...settings, notify_territory_promos: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div>
                <p className="font-medium text-white">Territory Promo Alerts</p>
                <p className="text-sm text-gray-400 mt-1">
                  Get notified when an account in your territory is assigned to a promo.
                </p>
              </div>
            </label>
          </div>

          {/* Territory Selection (shown when territory alerts enabled) */}
          {settings.notify_territory_promos && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Your Territories
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Select the territories you want to receive alerts for:
              </p>
              <div className="flex flex-wrap gap-2">
                {allTerritories.map(territory => (
                  <button
                    key={territory}
                    onClick={() => toggleTerritory(territory)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      settings.territories.includes(territory)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {territory}
                  </button>
                ))}
              </div>
              {settings.territories.length === 0 && (
                <p className="text-yellow-400 text-sm mt-2">
                  ⚠️ Select at least one territory to receive alerts
                </p>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg transition shadow-lg shadow-blue-600/30"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 pt-4 border-t border-gray-700/50">
            <p className="text-gray-500 text-xs text-center">
              💡 You can change these settings anytime. Weekly summaries are sent every Monday at 8am.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings
