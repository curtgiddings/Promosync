import React from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './Login'
import Dashboard from './Dashboard'
import './App.css'

// Main app component that shows Login or Dashboard based on auth state
function AppContent() {
  const { user } = useAuth()

  // If no user is logged in, show Login
  // If user is logged in, show Dashboard
  return user ? <Dashboard /> : <Login />
}

// Wrapper that provides auth context to entire app
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
