import React, { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'

const Dashboard = () => {
  const { user, signOut, isAdmin } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch data on component mount
  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      // Example: Fetch all accounts
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('account_name')

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-500">PromoSync</h1>
              <p className="text-sm text-gray-400">Welcome back, {user?.name}</p>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin badge */}
        {isAdmin && (
          <div className="mb-6 inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
            Admin
          </div>
        )}

        {/* Sample section - YOU'LL REPLACE THIS */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Accounts</h2>
          
          {loading ? (
            <p className="text-gray-400">Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="text-gray-400">No accounts yet. Add some in Supabase!</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-gray-700 p-4 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="text-white font-medium">{account.account_name}</p>
                    <p className="text-sm text-gray-400">{account.territory}</p>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {/* YOU'LL ADD: Progress bars, unit counts, etc. */}
                    Sample data
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Where YOU'LL add more sections */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Next Steps</h2>
          <ul className="space-y-2 text-gray-300">
            <li>✅ Login system working</li>
            <li>✅ Database connection working</li>
            <li>✅ Fetching data working</li>
            <li className="text-yellow-400">⏳ Add: Quick entry form</li>
            <li className="text-yellow-400">⏳ Add: Progress calculations</li>
            <li className="text-yellow-400">⏳ Add: Filters</li>
            <li className="text-yellow-400">⏳ Add: Admin panel</li>
          </ul>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
