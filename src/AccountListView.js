import React from 'react'

/**
 * AccountListView Component
 * 
 * Compact table view showing 8-10 accounts at once
 * More efficient for scanning territories
 */

const AccountListView = ({ 
  accounts, 
  accountProgress, 
  onAssignPromo, 
  onQuickLog 
}) => {

  const getStatusColor = (progress) => {
    if (progress >= 100) return 'text-green-400'
    if (progress >= 75) return 'text-yellow-400'
    if (progress >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  const getStatusIcon = (progress) => {
    if (progress >= 100) return '🟢'
    if (progress >= 75) return '🟡'
    if (progress >= 50) return '🟠'
    return '🔴'
  }

  const getProgressBarColor = (progress) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-yellow-500'
    if (progress >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-900/50 border-b border-gray-700/50">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-3">Account</div>
          <div className="col-span-2">Territory</div>
          <div className="col-span-2">Promo</div>
          <div className="col-span-3">Progress</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-700/50">
        {accounts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="text-4xl block mb-3">📭</span>
            <p className="text-gray-400">No accounts on promos</p>
            <p className="text-gray-500 text-sm mt-1">Assign accounts to promos to see them here</p>
          </div>
        ) : (
          accounts.map((account) => {
            const progress = accountProgress[account.id] || 0
            
            return (
              <div 
                key={account.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-700/30 transition-colors items-center"
              >
                {/* Account Name */}
                <div className="col-span-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🏢</span>
                    <span className="font-semibold text-white truncate">
                      {account.account_name}
                    </span>
                  </div>
                </div>

                {/* Territory */}
                <div className="col-span-2">
                  <span className="text-gray-300 text-sm">
                    📍 {account.territory}
                  </span>
                </div>

                {/* Promo Info */}
                <div className="col-span-2">
                  {account.promo_name ? (
                    <div>
                      <div className="font-medium text-white">
                        {account.promo_name}
                      </div>
                      {account.discount && (
                        <div className="text-xs text-green-400">
                          {account.discount}% off
                        </div>
                      )}
                      {account.terms && (
                        <div className="text-xs text-gray-500">
                          {account.terms}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">No promo</span>
                  )}
                </div>

                {/* Progress */}
                <div className="col-span-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">
                        {account.units_sold || 0} / {account.target_units || 0}
                      </span>
                      <span className={`font-bold ${getStatusColor(progress)}`}>
                        {getStatusIcon(progress)} {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-full ${getProgressBarColor(progress)} rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end space-x-2">
                  <button
                    onClick={() => onQuickLog(account, account.promoData)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition"
                  >
                    Log
                  </button>
                  <button
                    onClick={() => onAssignPromo(account, account.promoData)}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded transition"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AccountListView
