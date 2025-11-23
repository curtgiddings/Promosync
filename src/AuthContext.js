import React, { createContext, useState, useContext, useEffect } from 'react'

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

  const checkUser = () => {
    try {
      // Check localStorage for existing user
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = (userData) => {
    // Accept user data object directly (already validated from Login)
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    return { success: true }
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('user')
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
