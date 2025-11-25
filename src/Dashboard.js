import React, { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import StatsHeader from './StatsHeader'
import ProgressCard from './ProgressCard'
import AccountListView from './AccountListView'
import AssignPromo from './AssignPromo'
import QuickEntry from './QuickEntry'
import AddAccountToPromo from './AddAccountToPromo'
import Toast from './Toast'

const Dashboard = () => {
  const { user, signOut, isAdmin } = useAuth()
  
  // Data
  const [accounts, setAccounts] = useState([])
  const [accountsWithPromos, setAccountsWithPromos] = useState([]) // NEW: Only accounts on promos
  const [accountProgress, setAccountProgress] = useState({})
  const [loading, setLoading] = useState(true)
  
  // View toggle
  const [viewMode, setViewMode] = useState('list') // 'list' or 'card'
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [territoryFilter, setTerritoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modals
  const [showQuickEntry, setShowQuickEntry] = useState(false)
  const [showAssignPromo, setShowAssignPromo] = useState(false)
  const [showAddToPromo, setShowAddToPromo] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedAccountPromo, setSelectedAccountPromo] = useState(null)
  
  // Toast notifications
  const [toasts, setToasts] = useState([])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      if (e.key === '/') {
        e.preventDefault()
        document.querySelector('input[type="text"]')?.focus()
      }
      
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setSelectedAccount(null)
        setSelectedAccountPromo(null)
        setShowQuickEntry(true)
      }
      
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        fetchAccounts()
        showToast('Refreshed!', 'success')
      }
      
      if (e.key === 'Escape') {
        setShowQuickEntry(false)
        setShowAssignPromo(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      // Fetch accounts with promo data attached
      const { data: accountPromos, error: promoError } = await supabase
        .from('account_promos')
        .select(`
          account_id,
          target_units,
          terms,
          promos (
            id,
            promo_name,
            promo_code,
            discount
          )
        `)

      if (promoError) throw promoError

      // Get account IDs that have promos
      const accountIdsWithPromos = accountPromos.map(ap => ap.account_id)

      // Fetch only accounts that are on promos
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .in('id', accountIdsWithPromos)
        .order('account_name')

      if (accountsError) throw accountsError

      // Attach promo data to accounts
      const enrichedAccounts = accountsData.map(account => {
        const accountPromo = accountPromos.find(ap => ap.account_id === account.id)
        return {
          ...account,
          promo_name: accountPromo?.promos?.promo_name,
          discount: accountPromo?.promos?.discount,
          terms: accountPromo?.terms,
          target_units: accountPromo?.target_units,
          promo_id: accountPromo?.promos?.id,
          promoData: accountPromo
        }
      })

      setAccountsWithPromos(enrichedAccounts)
      await calculateAllProgress(enrichedAccounts)

    } catch (error) {
      console.error('Error fetching accounts:', error)
      showToast('Failed to load accounts', 'error')
    } finally {
      setLoading(false)
    }
  }

  const calculateAllProgress = async (accountsList) => {
    const progressMap = {}
    
    for (const account of accountsList) {
      try {
        if (!account.promo_id) {
          progressMap[account.id] = 0
          continue
        }

        const { data: transactions } = await supabase
          .from('transactions')
          .select('units_sold')
          .eq('account_id', account.id)
          .eq('promo_id', account.promo_id)

        const totalUnits = transactions?.reduce((sum, t) => sum + t.units_sold, 0) || 0
        const progress = account.target_units ? Math.round((totalUnits / account.target_units) * 100) : 0
        
        progressMap[account.id] = progress
        
        // Store units_sold in account for list view
        account.units_sold = totalUnits
      } catch (error) {
        progressMap[account.id] = 0
      }
    }
    
    setAccountProgress(progressMap)
  }

  const showToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const territories = ['all', ...new Set(accountsWithPromos.map(a => a.territory).filter(Boolean))]

  const filteredAccounts = accountsWithPromos.filter(account => {
    const matchesSearch = 
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.territory?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTerritory = territoryFilter === 'all' || account.territory === territoryFilter
    
    let matchesStatus = true
    if (statusFilter !== 'all') {
      const progress = accountProgress[account.id]
      if (statusFilter === 'behind') {
        matchesStatus = progress >= 0 && progress < 75
      } else if (statusFilter === 'ontrack') {
        matchesStatus = progress >= 75 && progress < 100
      } else if (statusFilter === 'met') {
        matchesStatus = progress >= 100
      }
    }
    
    return matchesSearch && matchesTerritory && matchesStatus
  })

  const exportToCSV = async (territory = 'all') => {
    try {
      const accountsToExport = territory === 'all' 
        ? accountsWithPromos 
        : accountsWithPromos.filter(a => a.territory === territory)

      const exportData = accountsToExport.map(account => ({
        'Account Name': account.account_name,
        'Territory': account.territory,
        'Promo': account.promo_name || 'Not Assigned',
        'Discount': account.discount ? `${account.discount}%` : 'N/A',
        'Terms': account.terms || 'N/A',
        'Target': account.target_units || 0,
        'Units Sold': account.units_sold || 0,
        'Progress': `${accountProgress[account.id] || 0}%`,
        'Status': accountProgress[account.id] >= 100 ? 'Met' : accountProgress[account.id] >= 75 ? 'On Track' : 'Behind'
      }))

      const headers = Object.keys(exportData[0])
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => `"${row[header]}"`).join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      const filename = territory === 'all' 
        ? 'PromoSync-All-Territories.csv' 
        : `PromoSync-${territory}.csv`
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showToast('Exported successfully!', 'success')
    } catch (error) {
      console.error('Error exporting:', error)
      showToast('Export failed. Please try again.', 'error')
    }
  }

  const handleQuickLog = (account, promoData) => {
    setSelectedAccount(account)
    setSelectedAccountPromo(promoData)
    setShowQuickEntry(true)
  }

  const handleAssignPromo = (account, currentPromo = null) => {
    setSelectedAccount(account)
    setSelectedAccountPromo(currentPromo)
    setShowAssignPromo(true)
  }

  const handleRefresh = () => {
    fetchAccounts()
    showToast('Refreshed!', 'success')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                PromoSync
              </h1>
              <p className="text-sm text-gray-400">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="hidden md:block text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
                Press <kbd className="px-1.5 py-0.5 bg-gray-600 rounded text-gray-300 font-mono text-xs">/</kbd> to search
              </span>
              {isAdmin && (
                <span className="px-3 py-1 bg-blue-600/90 text-white text-sm rounded-full font-medium">
                  Admin
                </span>
              )}
              <button
                onClick={signOut}
                className="px-4 py-2 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg transition font-medium text-sm"
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 px-4">
          <div className="flex gap-3">
            {/* Add to Promo Button - LEFT */}
            <button
              onClick={() => setShowAddToPromo(true)}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-150 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40"
            >
              <span className="text-lg">➕</span>
              <span>Add to Promo</span>
            </button>

            {/* Quick Log Units Button */}
            <button
              onClick={() => {
                setSelectedAccount(null)
                setSelectedAccountPromo(null)
                setShowQuickEntry(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-150 flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 ring-2 ring-blue-600/20"
            >
              <span className="text-lg">📝</span>
              <span>Quick Log Units</span>
              <kbd className="hidden md:inline ml-2 px-1.5 py-0.5 bg-blue-700 rounded text-xs font-mono">N</kbd>
            </button>
          </div>
          
          <div className="flex gap-3">{/* Utility Actions - Right */}
            <button
              onClick={handleRefresh}
              className="bg-gray-700/80 hover:bg-gray-600 border border-gray-600/50 text-gray-200 font-medium py-3 px-5 rounded-lg transition-all duration-150 flex items-center justify-center space-x-2"
            >
              <span className="text-lg">🔄</span>
              <span>Refresh</span>
              <kbd className="hidden md:inline ml-2 px-1.5 py-0.5 bg-gray-600 rounded text-xs font-mono">R</kbd>
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="bg-emerald-600/90 hover:bg-emerald-700 text-white font-medium py-3 px-5 rounded-lg transition-all duration-150 flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 hover:shadow-lg">
                <span className="text-lg">📥</span>
                <span>Export</span>
                <span className="text-xs">▼</span>
              </button>
              
              <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 overflow-hidden">
                <button
                  onClick={() => exportToCSV('all')}
                  className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <span>📊</span>
                  <span>All Territories</span>
                </button>
                <div className="border-t border-gray-700"></div>
                <button
                  onClick={() => exportToCSV('Kelowna')}
                  className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <span>📍</span>
                  <span>Kelowna Only</span>
                </button>
                <button
                  onClick={() => exportToCSV('Richmond')}
                  className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <span>📍</span>
                  <span>Richmond Only</span>
                </button>
                <button
                  onClick={() => exportToCSV('Vancouver')}
                  className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <span>📍</span>
                  <span>Vancouver Only</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filters, and View Toggle */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5 mb-6 shadow-lg">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">🔍</span>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search accounts..."
                  className="w-full pl-12 pr-12 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition"
                  >
                    <span className="text-lg">✕</span>
                  </button>
                )}
              </div>
            </div>

            {/* Territory Filter */}
            <div className="w-full lg:w-56">
              <select
                value={territoryFilter}
                onChange={(e) => setTerritoryFilter(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                {territories.map(territory => (
                  <option key={territory} value={territory}>
                    {territory === 'all' ? '🌍 All Territories' : `📍 ${territory}`}
                  </option>
                ))}
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex bg-gray-700/50 rounded-lg p-1 border border-gray-600/50">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md font-medium transition flex items-center space-x-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>☰</span>
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-4 py-2 rounded-md font-medium transition flex items-center space-x-2 ${
                  viewMode === 'card'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>▦</span>
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
              }`}
            >
              All Accounts
            </button>
            <button
              onClick={() => setStatusFilter('behind')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                statusFilter === 'behind'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
              }`}
            >
              <span>🔴</span>
              <span>Behind</span>
            </button>
            <button
              onClick={() => setStatusFilter('ontrack')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                statusFilter === 'ontrack'
                  ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
              }`}
            >
              <span>🟡</span>
              <span>On Track</span>
            </button>
            <button
              onClick={() => setStatusFilter('met')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                statusFilter === 'met'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
              }`}
            >
              <span>🟢</span>
              <span>Target Met</span>
            </button>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Showing <span className="font-semibold text-white">{filteredAccounts.length}</span> accounts on promos
            </span>
            {(searchTerm || territoryFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setTerritoryFilter('all')
                  setStatusFilter('all')
                }}
                className="text-blue-400 hover:text-blue-300 transition flex items-center space-x-1 text-sm"
              >
                <span>✕</span>
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Accounts Display - List or Card View */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
            <p className="text-gray-400 mt-4 text-lg">Loading accounts...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl">
            <span className="text-6xl mb-4 block">📭</span>
            <p className="text-gray-400 text-lg mb-2 font-medium">
              {searchTerm || territoryFilter !== 'all' || statusFilter !== 'all'
                ? 'No accounts match your filters' 
                : 'No accounts on promos yet'}
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Assign accounts to promos to see them here
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <AccountListView
            accounts={filteredAccounts}
            accountProgress={accountProgress}
            onAssignPromo={handleAssignPromo}
            onQuickLog={handleQuickLog}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

      {/* Modals */}
      {showQuickEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full my-8 shadow-2xl border border-gray-700/50">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-white">Quick Log Units</h2>
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
                  showToast('Units logged successfully!', 'success')
                }}
              />
            </div>
          </div>
        </div>
      )}

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
            showToast('Promo assigned successfully!', 'success')
          }}
        />
      )}

      {/* Add Account to Promo Modal */}
      {showAddToPromo && (
        <AddAccountToPromo
          onClose={() => setShowAddToPromo(false)}
          onAssign={(account, promoData) => {
            setSelectedAccount(account)
            setSelectedAccountPromo(promoData)
            setShowAssignPromo(true)
          }}
        />
      )}
    </div>
  )
}

export default Dashboard
