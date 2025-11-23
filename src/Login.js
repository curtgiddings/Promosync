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
      const { data, error } = await supabase
        .from('reps')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('password', password)
        .single()

      if (error || !data) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Store user in localStorage and redirect immediately
      localStorage.setItem('user', JSON.stringify(data))
      
      // Force immediate redirect
      window.location.href = '/'

    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 animate-gradient"></div>
      
      {/* Animated Orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed"></div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-10 mt-8">
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
            PromoSync
          </h1>
          <p className="text-blue-300 text-xl font-semibold mb-2">
            Team Synergy Sales Tracker
          </p>
          <p className="text-gray-400 text-sm">
            Stay informed. Stay ahead.
          </p>
        </div>

        {/* Glass Card */}
        <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center space-x-2 animate-shake">
                <span className="text-xl">⚠️</span>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-800 disabled:to-blue-900 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Info */}
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <p className="text-center text-gray-400 text-sm">
              <span className="font-semibold text-gray-300">Demo:</span> Create a rep in Supabase to test
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-lg p-3">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-xs text-gray-300 font-medium">Real-time</div>
            <div className="text-xs text-gray-500">Tracking</div>
          </div>
          <div className="bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-lg p-3">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xs text-gray-300 font-medium">Analytics</div>
            <div className="text-xs text-gray-500">Dashboard</div>
          </div>
          <div className="bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-lg p-3">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-xs text-gray-300 font-medium">Goal</div>
            <div className="text-xs text-gray-500">Tracking</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs">
            Professional sales tracking and analytics
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
