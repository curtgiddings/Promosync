import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * EXAMPLE COMPONENT - Reference Pattern
 * 
 * This shows a complete pattern for:
 * - Fetching data
 * - Creating new records
 * - Handling form state
 * - Error handling
 * - Loading states
 * 
 * Use this as a reference when building your components!
 */

const ExampleComponent = () => {
  // State management
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  // Fetch data when component mounts
  useEffect(() => {
    fetchItems()
  }, [])

  // Fetch function
  const fetchItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('your_table_name')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching items:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('your_table_name')
        .insert({
          name: formData.name,
          description: formData.description
        })

      if (error) throw error

      // Success!
      setFormData({ name: '', description: '' }) // Reset form
      setShowForm(false) // Close form
      fetchItems() // Refresh the list
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  // Render
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header with action button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Example Component</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          {showForm ? 'Cancel' : 'Add New'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-lg">
          Error: {error}
        </div>
      )}

      {/* Form (conditional) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-700 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
          >
            Submit
          </button>
        </form>
      )}

      {/* List of items */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 mt-2">Loading...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No items yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
            >
              <h3 className="text-white font-semibold">{item.name}</h3>
              {item.description && (
                <p className="text-gray-400 text-sm mt-1">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExampleComponent

/*
 * KEY TAKEAWAYS:
 * 
 * 1. Always use try/catch for database operations
 * 2. Show loading states while fetching
 * 3. Handle errors gracefully
 * 4. Refresh data after mutations (inserts/updates)
 * 5. Use conditional rendering for empty states
 * 6. Keep forms simple and controlled
 * 7. Provide user feedback for actions
 * 
 * Copy this pattern when building:
 * - QuickEntry.js (form to log units)
 * - AdminPanel.js (forms to create promos/accounts)
 * - TransactionLog.js (list of transactions)
 */
