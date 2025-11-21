import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from './supabaseClient'

// Create context for auth state
const AuthContext = createContext()

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// AuthProvider component wraps the app and provides auth state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in on mount
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Fetch user details from reps table
        const { data: repData } = await supabase
          .from('reps')
          .select('*')
          .eq('email', session.user.email)
          .single()
        
        setUser(repData)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      // This is a simplified login - we'll use Supabase auth later
      // For now, just check if user exists in reps table
      const { data: repData, error } = await supabase
        .from('reps')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !repData) {
        throw new Error('Invalid credentials')
      }

      // In production, you'd verify password hash here
      // For skeleton, we'll skip password verification
      setUser(repData)
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }

  const signOut = async () => {
    setUser(null)
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isAdmin: user?.is_admin || false
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
