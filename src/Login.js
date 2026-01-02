import bcrypt from 'bcryptjs'
import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Trying email:', email.trim().toLowerCase())
      
      // Find user by email only
      const { data, error } = await supabase
        .from('reps')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single()

      console.log('Query result:', { data, error })

      if (error || !data) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      console.log('Found user, checking password against hash:', data.password_hash)
      
      // Check password with bcrypt
      const isValid = await bcrypt.compare(password, data.password_hash)
      console.log('Password valid:', isValid)
      
      if (!isValid) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Use AuthContext signIn
      signIn(data)
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }
      // Use AuthContext signIn
      signIn(data)
    } catch (err) {
      console.error('Login error:', err)
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
              Demo: Create a rep in Supabase to test
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
