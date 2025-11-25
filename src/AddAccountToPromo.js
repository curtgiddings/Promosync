import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * AddAccountToPromo Component
 * 
 * Modal that searches ALL accounts (including those not on promos)
 * Shows which accounts have promos, which don't
 * Quick assign workflow
 */

const AddAccountToPromo = ({ onClose, onAssign }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [allAccounts, setAllAccounts] = useState([])
  const [accountPromoStatus, setAccountPromoStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [filteredAccounts, setFilteredAccounts] = useState([])

  useEffect(() => {
    fetchAllAccounts()
  }, [])

  useEffect(() => {
    // Filter accounts based on search
    if (searchTerm.trim() === '') {
      setFilteredAccounts(allAccounts.slice(0, 50)) // Show first 50 by default
    } else {
      const filtered = allAccounts.filter(account => 
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.territory?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredAccounts(filtered.slice(0, 50)) // Limit to 50 results
    }
  }, [searchTerm, allAccounts])

  const fetchAllAccounts = async () => {
    try {
      // Fetch ALL accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('account_name')

      if (accountsError) throw accountsError

      // Fetch account_promos to see which accounts are on promos
      const { data: accountPromos, error: promosError } = await supabase
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

      if (promosError) throw promosError

      // Build status map
      const statusMap = {}
      accountPromos.forEach(ap => {
        statusMap[ap.account_id] = {
          hasPromo: true,
          promoName: ap.promos?.promo_name,
          promoCode: ap.promos?.promo_code,
          discount: ap.promos?.discount,
          targetUnits: ap.target_units,
          terms: ap.terms,
          promoData: ap
        }
      })

      // Mark accounts without promos
      accountsData.forEach(account => {
        if (!statusMap[account.id]) {
          statusMap[account.id] = {
            hasPromo: false
          }
        }
      })

      setAllAccounts(accountsData)
      setAccountPromoStatus(statusMap)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = (account) => {
    const status = accountPromoStatus[account.id]
    onAssign(account, status.hasPromo ? status.promoData : null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-gray-700/50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Add Account to Promo</h2>
              <p className="text-gray-400 text-sm mt-1">Search from {allAccounts.length} accounts</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-800"
            >
              ✕
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-400 text-lg">🔍</span>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by account name or territory..."
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-400 mt-2">Loading accounts...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl block mb-3">🔍</span>
              <p className="text-gray-400">No accounts found</p>
              <p className="text-gray-500 text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAccounts.map(account => {
                const status = accountPromoStatus[account.id]
                
                return (
                  <div
                    key={account.id}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">🏢</span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white font-semibold truncate">
                              {account.account_name}
                            </h3>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-gray-400 text-sm">
                                📍 {account.territory || 'No territory'}
                              </span>
                              {status.hasPromo && (
                                <>
                                  <span className="text-gray-600">•</span>
                                  <span className="text-green-400 text-sm font-medium">
                                    ✓ {status.promoName} ({status.discount}%)
                                  </span>
                                  {status.terms && (
                                    <span className="text-gray-500 text-xs">
                                      {status.terms}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleAssign(account)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${
                          status.hasPromo
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'
                        }`}
                      >
                        {status.hasPromo ? (
                          <>
                            <span>✏️</span>
                            <span>Edit</span>
                          </>
                        ) : (
                          <>
                            <span>➕</span>
                            <span>Assign</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Showing X results */}
          {!loading && filteredAccounts.length > 0 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              Showing {filteredAccounts.length} of {
                searchTerm ? allAccounts.filter(a => 
                  a.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  a.territory?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length : allAccounts.length
              } accounts
              {filteredAccounts.length === 50 && <span className="ml-1">(limited to 50 results - refine search for more)</span>}
            </div>
          )}
        </div>

        {/* Footer with tips */}
        <div className="p-4 border-t border-gray-700/50 bg-gray-800/30 flex-shrink-0">
          <div className="flex items-start space-x-2 text-sm text-gray-400">
            <span>💡</span>
            <div>
              <p><strong className="text-gray-300">Green checkmark</strong> = Already on a promo (click Edit to change)</p>
              <p className="mt-1"><strong className="text-gray-300">Blue Assign</strong> = Not on a promo yet (click to add)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddAccountToPromo
