import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function RepBreakdown({ account, promo, onClose }) {
  const [repTotals, setRepTotals] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalUnits, setTotalUnits] = useState(0)
  const [notes, setNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(true)

  useEffect(() => {
    fetchRepBreakdown()
    fetchNotes()
  }, [account, promo])

  const fetchRepBreakdown = async () => {
    try {
      // Get all transactions for this account/promo combo
      let query = supabase
        .from('transactions')
        .select(`
          units_sold,
          rep_id,
          reps (
            id,
            name
          )
        `)
        .eq('account_id', account.id)

      if (promo?.id) {
        query = query.eq('promo_id', promo.id)
      }

      const { data: transactions, error } = await query

      if (error) throw error

      // Aggregate by rep
      const repMap = {}
      let total = 0

      transactions?.forEach(t => {
        const repId = t.rep_id
        const repName = t.reps?.name || 'Unknown'
        
        if (!repMap[repId]) {
          repMap[repId] = { id: repId, name: repName, units: 0 }
        }
        repMap[repId].units += t.units_sold
        total += t.units_sold
      })

      // Convert to array and sort by units descending
      const sortedReps = Object.values(repMap).sort((a, b) => b.units - a.units)
      
      setRepTotals(sortedReps)
      setTotalUnits(total)
    } catch (err) {
      console.error('Error fetching rep breakdown:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('account_notes')
        .select(`
          id,
          note,
          created_at,
          reps (
            name
          )
        `)
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setNotes(data || [])
    } catch (err) {
      console.error('Error fetching notes:', err)
    } finally {
      setNotesLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const target = promo?.target_units || account.target_units || 0
  const progress = target > 0 ? Math.round((totalUnits / target) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">{account.account_name}</h2>
            {account.account_number && (
              <p className="text-gray-400 text-sm">#{account.account_number}</p>
            )}
            {account.territory && (
              <p className="text-gray-400 text-sm">{account.territory}</p>
            )}
            {promo && (
              <p className="text-blue-400 text-sm mt-1">{promo.promo_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Progress Summary */}
          <div className="p-4 bg-gray-700/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">Total Progress</span>
              <span className="text-white font-bold">
                {totalUnits} / {target} units
                {target > 0 && ` (${progress}%)`}
              </span>
            </div>
            {target > 0 && (
              <div className="w-full bg-gray-600 rounded-full h-3">
                <div
                  className={`h-full rounded-full transition-all ${
                    progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Rep Breakdown */}
          <div className="p-4">
            <h3 className="text-gray-400 text-sm font-medium mb-3">Units by Rep</h3>
            
            {loading ? (
              <div className="text-center text-gray-400 py-4">Loading...</div>
            ) : repTotals.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No units logged yet
              </div>
            ) : (
              <div className="space-y-2">
                {repTotals.map((rep, index) => {
                  const repPercent = target > 0 ? Math.round((rep.units / target) * 100) : 0
                  return (
                    <div key={rep.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className={`text-lg ${index === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                          {index === 0 ? '🏆' : `#${index + 1}`}
                        </span>
                        <span className="text-white">{rep.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold">{rep.units}</span>
                        <span className="text-gray-400 text-sm ml-1">units</span>
                        {target > 0 && (
                          <span className="text-gray-500 text-sm ml-2">({repPercent}%)</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="p-4 border-t border-gray-700">
            <h3 className="text-gray-400 text-sm font-medium mb-3">📝 Notes</h3>
            
            {notesLoading ? (
              <div className="text-center text-gray-400 py-2">Loading notes...</div>
            ) : notes.length === 0 ? (
              <div className="text-center text-gray-500 py-2 text-sm">
                No notes for this account
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 bg-gray-700/50 rounded-lg">
                    <p className="text-white text-sm">{note.note}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {note.reps?.name || 'Unknown'} • {formatDate(note.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default RepBreakdown;
