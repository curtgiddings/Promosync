import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setDebugInfo('')
    setLoading(true)

    try {
      console.log('🔍 Attempting login with:', { email, password })
      setDebugInfo(`Searching for email: ${email.trim().toLowerCase()}`)

      const { data, error } = await supabase
        .from('reps')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('password', password)
        .single()

      console.log('📦 Supabase response:', { data, error })
      
      if (error) {
        console.error('❌ Supabase error:', error)
        setDebugInfo(`Error code: ${error.code} - ${error.message}`)
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      if (!data) {
        console.error('❌ No data returned')
        setDebugInfo('No user found with these credentials')
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      console.log('✅ Login successful, calling signIn()')
      setDebugInfo('Login successful! Redirecting...')
      signIn(data)
    } catch (err) {
      console.error('💥 Catch block error:', err)
      setDebugInfo(`Exception: ${err.message}`)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3">PromoSync</h1>
          <p className="text-blue-300 text-xl font-semibold mb-2">
            Team Synergy Sales Tracker
          </p>
          <p className="text-gray-400 text-sm">Stay informed. Stay ahead.</p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Debug Info */}
            {debugInfo && (
              <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-3 rounded-lg text-sm">
                🔍 {debugInfo}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              <p className="text-xs text-gray-500 mt-1">
                Will search for: "{email.trim().toLowerCase()}"
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-gray-400 text-sm">
              Debug mode: Check browser console (F12) for details
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
