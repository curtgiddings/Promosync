import React from 'react'

/**
 * AccountListView - Mobile Optimized with Optional Pace Indicator
 * 
 * Desktop: Full table view
 * Mobile: Card-based layout
 * Optional: Pace indicator when showPace is enabled
 */

const AccountListView = ({ 
  accounts, 
  accountProgress, 
  onAssignPromo, 
  onQuickLog,
  onViewNotes,
  showPace = false,
  quarterProgress = 50
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

  // Calculate pace status
  const getPaceInfo = (progress) => {
    const diff = progress - quarterProgress
    
    if (progress >= 100) {
      return { label: 'Met', color: 'text-green-400', bg: 'bg-green-500/20' }
    } else if (diff >= 10) {
      return { label: `+${Math.round(diff)}%`, color: 'text-green-400', bg: 'bg-green-500/20' }
    } else if (diff >= -10) {
      return { label: 'On Pace', color: 'text-blue-400', bg: 'bg-blue-500/20' }
    } else {
      return { label: `${Math.round(diff)}%`, color: 'text-red-400', bg: 'bg-red-500/20' }
    }
  }

  return (
    <>
      {/* Desktop: Table View (hidden on mobile) */}
      <div className="hidden md:block bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
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
              const progressData = accountProgress[account.id] || { progress: 0, units_sold: 0 }
              const progress = progressData.progress || 0
              const unitsSold = progressData.units_sold || account.units_sold || 0
              const paceInfo = getPaceInfo(progress)
              
              return (
                <div 
                  key={account.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-700/30 transition-colors items-center"
                >
                  {/* Account Name */}
                  <div className="col-span-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🏢</span>
                      <div className="min-w-0">
                        <span className="font-semibold text-white truncate block">
                          {account.account_name}
                        </span>
                        {showPace && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${paceInfo.bg} ${paceInfo.color}`}>
                            {paceInfo.label}
                          </span>
                        )}
                      </div>
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
                          {unitsSold} / {account.target_units || 0}
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
                      onClick={() => onViewNotes && onViewNotes(account)}
                      className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition"
                      title="Notes"
                    >
                      💬
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

      {/* Mobile: Card View (visible only on mobile) */}
      <div className="md:hidden space-y-4">
        {accounts.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
            <span className="text-4xl block mb-3">📭</span>
            <p className="text-gray-400">No accounts on promos</p>
            <p className="text-gray-500 text-sm mt-1">Assign accounts to promos to see them here</p>
          </div>
        ) : (
          accounts.map((account) => {
            const progressData = accountProgress[account.id] || { progress: 0, units_sold: 0 }
            const progress = progressData.progress || 0
            const unitsSold = progressData.units_sold || account.units_sold || 0
            const paceInfo = getPaceInfo(progress)
            
            return (
              <div 
                key={account.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4"
              >
                {/* Account Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">🏢</span>
                      <h3 className="font-semibold text-white truncate">
                        {account.account_name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="text-gray-400 text-sm">
                        📍 {account.territory}
                      </p>
                      {showPace && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${paceInfo.bg} ${paceInfo.color}`}>
                          {paceInfo.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`ml-2 font-bold text-lg whitespace-nowrap ${getStatusColor(progress)}`}>
                    {getStatusIcon(progress)} {progress}%
                  </span>
                </div>

                {/* Promo Info */}
                {account.promo_name && (
                  <div className="mb-3 pb-3 border-b border-gray-700/50">
                    <div className="font-medium text-white mb-1">
                      {account.promo_name}
                      {account.discount && (
                        <span className="ml-2 text-sm text-green-400">
                          ({account.discount}% off)
                        </span>
                      )}
                    </div>
                    {account.terms && (
                      <div className="text-xs text-gray-500">
                        Terms: {account.terms}
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-300">
                      {unitsSold} / {account.target_units || 0} units
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-full ${getProgressBarColor(progress)} rounded-full transition-all duration-300`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons - Touch Friendly (44px height) */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onQuickLog(account, account.promoData)}
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 rounded-lg transition flex items-center justify-center space-x-2"
                  >
                    <span>📝</span>
                    <span>Log</span>
                  </button>
                  <button
                    onClick={() => onViewNotes && onViewNotes(account)}
                    className="bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white font-medium py-3 rounded-lg transition flex items-center justify-center space-x-2"
                  >
                    <span>💬</span>
                    <span>Notes</span>
                  </button>
                  <button
                    onClick={() => onAssignPromo(account, account.promoData)}
                    className="bg-gray-600 hover:bg-gray-500 active:bg-gray-700 text-white font-medium py-3 rounded-lg transition flex items-center justify-center space-x-2"
                  >
                    <span>✏️</span>
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

export default AccountListView
