import { useState } from 'react'

function ProgressCard({ account, promo, onAssignPromo, onQuickLog, onViewNotes, onViewRepBreakdown }) {
  const [expanded, setExpanded] = useState(false)
  
  const unitsSold = account.units_sold || 0
  const targetUnits = promo?.target_units || 0
  const isNoTarget = promo?.no_target || false
  const progress = targetUnits > 0 ? Math.round((unitsSold / targetUnits) * 100) : 0
  const hasNotes = account.notes && account.notes.trim().length > 0

  const getProgressColor = () => {
    if (isNoTarget) return 'bg-purple-500'
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusIcon = () => {
    if (isNoTarget) return '🎁'
    if (progress >= 100) return '✅'
    if (progress >= 75) return '🔵'
    if (progress >= 50) return '🟡'
    return '🔴'
  }

  return (
    <div 
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition cursor-pointer"
      onClick={() => onViewRepBreakdown && onViewRepBreakdown(account, promo)}
    >
      {/* Header - Account Name & Territory */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{account.account_name}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            {account.account_number && (
              <span className="text-gray-500">#{account.account_number}</span>
            )}
            {account.territory && (
              <span>📍 {account.territory}</span>
            )}
          </div>
        </div>
        <span className="text-2xl ml-2">{getStatusIcon()}</span>
      </div>

      {/* Promo Info */}
      {promo ? (
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-sm font-medium">{promo.promo_name}</span>
            {promo.discount && (
              <span className="text-green-400 text-xs">{promo.discount}% off</span>
            )}
          </div>
          {promo.terms && (
            <span className="text-gray-500 text-xs">{promo.terms}</span>
          )}
        </div>
      ) : (
        <div className="mb-3">
          <span className="text-gray-500 text-sm">⚠️ Not on promo</span>
        </div>
      )}

      {/* Progress Bar */}
      {promo && (
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">
              {unitsSold}{!isNoTarget && ` / ${targetUnits}`} units
            </span>
            {!isNoTarget && (
              <span className="text-white font-bold">{progress}%</span>
            )}
          </div>
          {!isNoTarget && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-full ${getProgressColor()} rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Notes Preview */}
      {hasNotes && (
        <div 
          className="mb-3 p-2 bg-gray-700/50 rounded text-sm"
          onClick={(e) => {
            e.stopPropagation()
            if (onViewNotes) onViewNotes(account)
          }}
        >
          <div className="flex items-start space-x-2">
            <span className="text-yellow-400">📝</span>
            <p className={`text-gray-300 ${expanded ? '' : 'line-clamp-2'}`}>
              {account.notes}
            </p>
          </div>
          {account.notes.length > 100 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="text-blue-400 text-xs mt-1 hover:underline"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onQuickLog(account, promo)}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition"
        >
          Log Units
        </button>
        <button
          onClick={() => onAssignPromo(account, promo)}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded transition"
        >
          {promo ? 'Edit' : 'Assign'}
        </button>
        <button
          onClick={() => onViewNotes && onViewNotes(account)}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded transition"
          title="Notes"
        >
          💬
        </button>
      </div>
    </div>
  )
}

export default ProgressCard
