import React, { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import StatsHeader from './StatsHeader'
import ProgressCard from './ProgressCard'
import AssignPromo from './AssignPromo'
import QuickEntry from './QuickEntry'

const Dashboard = () => {
  const { user, signOut, isAdmin } = useAuth()
  
  // Data
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [territoryFilter, setTerritoryFilter] = useState('all')
  
  // Modals
  const [showQuickEntry, setShowQuickEntry] = useState(false)
  const [showAssignPromo, setShowAssignPromo] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedAccountPromo, setSelectedAccountPromo] = useState(null)

  // Fetch data on component mount
  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
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

  // Get unique territories
  const territories = ['all', ...new Set(accounts.map(a => a.territory).filter(Boolean))]

  // Filter accounts based on search and filters
  const filteredAccounts = accounts.filter(account => {
    // Search filter
    const matchesSearch = 
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.territory?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Territory filter
    const matchesTerritory = territoryFilter === 'all' || account.territory === territoryFilter
    
    return matchesSearch && matchesTerritory
  })

  // Handle quick log from ProgressCard
  const handleQuickLog = (account, promoData) => {
    setSelectedAccount(account)
    setSelectedAccountPromo(promoData)
    setShowQuickEntry(true)
  }

  // Handle assign/change promo from ProgressCard
  const handleAssignPromo = (account, currentPromo = null) => {
    setSelectedAccount(account)
    setSelectedAccountPromo(currentPromo)
    setShowAssignPromo(true)
  }

  // Refresh after actions
  const handleRefresh = () => {
    fetchAccounts()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                PromoSync
              </h1>
              <p className="text-sm text-gray-400">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-full shadow-lg">
                  ⭐ Admin
                </span>
              )}
              <button
                onClick={signOut}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition shadow-md hover:shadow-lg"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Dashboard */}
        <StatsHeader />

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => {
              setSelectedAccount(null)
              setSelectedAccountPromo(null)
              setShowQuickEntry(true)
            }}
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <span className="text-xl">➕</span>
            <span>Quick Log Units</span>
          </button>
          
          <button
            onClick={handleRefresh}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
          >
            <span className="text-xl">🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-xl">🔍</span>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search accounts by name or territory..."
                  className="w-full pl-12 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition"
                  >
                    <span className="text-xl">✕</span>
                  </button>
                )}
              </div>
            </div>

            {/* Territory Filter */}
            <div className="w-full sm:w-56">
              <select
                value={territoryFilter}
                onChange={(e) => setTerritoryFilter(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {territories.map(territory => (
                  <option key={territory} value={territory}>
                    {territory === 'all' ? '🌍 All Territories' : `📍 ${territory}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Showing <span className="font-semibold text-white">{filteredAccounts.length}</span> of{' '}
              <span className="font-semibold text-white">{accounts.length}</span> accounts
            </span>
            {(searchTerm || territoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setTerritoryFilter('all')
                }}
                className="text-blue-400 hover:text-blue-300 transition flex items-center space-x-1"
              >
                <span>✕</span>
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Accounts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
            <p className="text-gray-400 mt-4 text-lg">Loading accounts...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <span className="text-6xl mb-4 block">📭</span>
            <p className="text-gray-400 text-lg mb-4">
              {searchTerm || territoryFilter !== 'all' 
                ? 'No accounts match your filters' 
                : 'No accounts yet. Add some in the database!'}
            </p>
            {(searchTerm || territoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setTerritoryFilter('all')
                }}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            {filteredAccounts.map((account) => (
              <ProgressCard
                key={account.id}
                account={account}
                onAssignPromo={(acc, promo) => handleAssignPromo(acc, promo)}
                onQuickLog={(acc, promo) => handleQuickLog(acc, promo)}
                onUpdate={handleRefresh}
              />
            ))}
          </div>
        )}
      </main>

      {/* Quick Entry Modal */}
      {showQuickEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full my-8 shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Quick Log Units</h2>
                <button
                  onClick={() => setShowQuickEntry(false)}
                  className="text-gray-400 hover:text-white transition text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-800"
                >
                  ✕
                </button>
              </div>
              <QuickEntry
                preSelectedAccount={selectedAccount}
                onSuccess={() => {
                  handleRefresh()
                  setShowQuickEntry(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Assign Promo Modal */}
      {showAssignPromo && selectedAccount && (
        <AssignPromo
          account={selectedAccount}
          currentPromo={selectedAccountPromo}
          onClose={() => {
            setShowAssignPromo(false)
            setSelectedAccount(null)
            setSelectedAccountPromo(null)
          }}
          onSuccess={() => {
            handleRefresh()
          }}
        />
      )}
    </div>
  )
}

export default Dashboard
