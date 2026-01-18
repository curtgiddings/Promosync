import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

/**
 * AccountNotes Component
 * 
 * Add and view notes on accounts
 * - Quick note input
 * - Note history with timestamps
 * - Who added each note
 */

const AccountNotes = ({ account, onClose }) => {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [account.id])

  const fetchNotes = async () => {
    try {
      // Try account_notes table first
      const { data, error } = await supabase
        .from('account_notes')
        .select(`
          id,
          note,
          created_at,
          reps (name)
        `)
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })

      if (error && error.code !== 'PGRST116') {
        // If table doesn't exist, fall back to accounts.notes field
        if (account.notes) {
          setNotes([{
            id: 'legacy',
            note: account.notes,
            created_at: null,
            reps: null
          }])
        }
      } else {
        setNotes(data || [])
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const addNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setSaving(true)
    try {
      // Try to insert into account_notes table
      const { error } = await supabase
        .from('account_notes')
        .insert({
          account_id: account.id,
          note: newNote.trim(),
          created_by: user?.id
        })

      if (error) {
        // Fall back to updating accounts.notes field
        const existingNotes = account.notes || ''
        const timestamp = new Date().toLocaleString()
        const newNoteWithMeta = `[${timestamp}] ${user?.name || 'Unknown'}: ${newNote.trim()}\n\n${existingNotes}`
        
        await supabase
          .from('accounts')
          .update({ notes: newNoteWithMeta })
          .eq('id', account.id)
      }

      // Log activity
      try {
        await supabase
          .from('activity_log')
          .insert({
            action_type: 'note_added',
            account_id: account.id,
            rep_id: user?.id,
            details: { note_preview: newNote.substring(0, 50) }
          })
      } catch (e) {
        // Activity logging is optional
      }

      setNewNote('')
      await fetchNotes()
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setSaving(false)
    }
  }

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'previously'
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-lg w-full shadow-2xl border border-gray-700/50 max-h-[80vh] flex flex-col">
        <div className="p-6 flex-shrink-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
              <span>💬</span>
              <span>Account Notes</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-800"
            >
              ✕
            </button>
          </div>

          {/* Account Info */}
          <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg mb-4">
            <p className="font-semibold text-white">{account.account_name}</p>
            <p className="text-sm text-gray-400">📍 {account.territory}</p>
          </div>

          {/* Add Note Form */}
          <form onSubmit={addNote} className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newNote.trim() || saving}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
              >
                {saving ? '...' : 'Add'}
              </button>
            </div>
          </form>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl block mb-2">📝</span>
              <p className="text-gray-400">No notes yet</p>
              <p className="text-gray-500 text-sm mt-1">Add a note above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note, index) => (
               <div
                  key={note.id || index}
                  className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-gray-200 flex-1">{note.note}</p>
                    {note.id !== 'legacy' && (
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="ml-2 text-gray-500 hover:text-red-400 transition text-sm"
                        title="Delete note"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                    {note.reps?.name && (
                      <>
                        <span>👤 {note.reps.name}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{getTimeAgo(note.created_at)}</span>
                  </div>
                </div>

        {/* Help Text */}
        <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
          <p className="text-gray-500 text-xs text-center">
            💡 Notes help you remember important details about this account
          </p>
        </div>
      </div>
    </div>
  )
}

export default AccountNotes
