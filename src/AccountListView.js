function AccountListView({ accounts, accountProgress, onAssignPromo, onQuickLog, onViewNotes, onViewRepBreakdown }) {
  
const getProgress = (account) => {
    const progressData = accountProgress[account.id]
    if (!progressData) return 0
    return progressData.progress || 0
  }

  const getStatusColor = (progress) => {
    if (progress >= 100) return 'text-green-400'
    if (progress >= 75) return 'text-blue-400'
    if (progress >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStatusIcon = (progress) => {
    if (progress >= 100) return '✅'
    if (progress >= 75) return '🔵'
    if (progress >= 50) return '🟡'
    return '🔴'
  }

  const getProgressBarColor = (progress) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Truncate notes for display
  const truncateNotes = (notes, maxLength = 50) => {
    if (!notes) return ''
    if (notes.length <= maxLength) return notes
    return notes.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-4">
      {/* Desktop: Table View (hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-full">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-700 rounded-t-lg text-sm font-medium text-gray-300">
            <div className="col-span-3">Account</div>
            <div className="col-span-1">Territory</div>
            <div className="col-span-2">Promo</div>
            <div className="col-span-2">Progress</div>
            <div className="col-span-2">Notes</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Rows */}
          {accounts.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No accounts found
            </div>
          ) : (
            accounts.map(account => {
              const progress = getProgress(account)
              const progressData = accountProgress[account.id]
              const isNoTarget = progressData?.no_target || false
              const hasNotes = account.notes && account.notes.trim().length > 0

              return (
                <div
                  key={account.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-700 hover:bg-gray-750 items-center cursor-pointer transition"
                  onClick={() => onViewRepBreakdown && onViewRepBreakdown(account, account.promoData)}
                >
                  {/* Account Name & Number */}
                  <div className="col-span-3">
                    <div className="font-medium text-white">{account.account_name}</div>
                    {account.account_number && (
                      <div className="text-xs text-gray-500">#{account.account_number}</div>
                    )}
                  </div>

                  {/* Territory */}
                  <div className="col-span-1 text-gray-400 text-sm">
                    {account.territory || '-'}
                  </div>

                  {/* Promo */}
                  <div className="col-span-2">
                    {account.promo_name ? (
                      <div>
                        <div className="font-medium text-white text-sm">
                          {account.promo_name}
                        </div>
                        {account.discount && (
                          <div className="text-xs text-green-400">
                            {account.discount}% off
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No promo</span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="col-span-2">
                    {account.promo_name ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">
                            {account.units_sold || 0}
                            {!isNoTarget && ` / ${account.target_units || 0}`}
                          </span>
                          {!isNoTarget && (
                            <span className={`font-bold ${getStatusColor(progress)}`}>
                              {getStatusIcon(progress)} {progress}%
                            </span>
                          )}
                          {isNoTarget && (
                            <span className="text-purple-400">🎁</span>
                          )}
                        </div>
                        {!isNoTarget && (
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-full ${getProgressBarColor(progress)} rounded-full transition-all duration-300`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </div>

                  {/* Notes Preview */}
                  <div className="col-span-2">
                    {hasNotes ? (
                      <div 
                        className="text-sm text-gray-400 truncate cursor-pointer hover:text-gray-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onViewNotes) onViewNotes(account)
                        }}
                        title={account.notes}
                      >
                        📝 {truncateNotes(account.notes)}
                      </div>
                    ) : (
                      <span className="text-gray-600 text-sm">-</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onQuickLog(account, account.promoData)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition"
                    >
                      Log
                    </button>
                    <button
                      onClick={() => onViewNotes && onViewNotes(account)}
                      className="px-2 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition"
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
          <div className="text-center text-gray-500 py-8">No accounts found</div>
        ) : (
          accounts.map(account => {
            const progress = getProgress(account)
            const progressData = accountProgress[account.id]
            const isNoTarget = progressData?.no_target || false
            const hasNotes = account.notes && account.notes.trim().length > 0

            return (
              <div
                key={account.id}
                className="bg-gray-800 rounded-lg p-4 cursor-pointer"
                onClick={() => onViewRepBreakdown && onViewRepBreakdown(account, account.promoData)}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{account.account_name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      {account.account_number && (
                        <span className="text-gray-500">#{account.account_number}</span>
                      )}
                      {account.territory && (
                        <span>📍 {account.territory}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-2xl">
                    {isNoTarget ? '🎁' : getStatusIcon(progress)}
                  </span>
                </div>

                {/* Promo & Progress */}
                {account.promo_name ? (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-blue-400 text-sm">{account.promo_name}</span>
                      {!isNoTarget && (
                        <span className="text-white text-sm font-bold">{progress}%</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm mb-2">
                      {account.units_sold || 0}{!isNoTarget && ` / ${account.target_units || 0}`} units
                    </div>
                    {!isNoTarget && (
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-full ${getProgressBarColor(progress)} rounded-full`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3 text-gray-500 text-sm">⚠️ Not on promo</div>
                )}

                {/* Notes */}
                {hasNotes && (
                  <div 
                    className="mb-3 p-2 bg-gray-700/50 rounded text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onViewNotes) onViewNotes(account)
                    }}
                  >
                    <span className="text-yellow-400 mr-2">📝</span>
                    <span className="text-gray-300">{truncateNotes(account.notes, 80)}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onQuickLog(account, account.promoData)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition"
                  >
                    Log Units
                  </button>
                  <button
                    onClick={() => onViewNotes && onViewNotes(account)}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition"
                  >
                    💬
                  </button>
                  <button
                    onClick={() => onAssignPromo(account, account.promoData)}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded transition"
                  >
                    {account.promo_name ? 'Edit' : 'Assign'}
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
