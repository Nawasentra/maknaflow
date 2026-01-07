// src/features/auth/api/auth.js
import axios from '@/lib/axios'

export const verifyGoogleToken = async (credential) => {
  const response = await axios.post('/auth/google/', { credential })
  return response.data
}

// src/features/auth/hooks/useAuth.js
import { createContext, useContext, useEffect, useState } from 'react'
import { verifyGoogleToken } from '../api/auth'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Verify token on app load
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser({ token })
    }
    setIsLoading(false)
  }, [])

  const login = async (credential) => {
    try {
      const data = await verifyGoogleToken(credential)
      localStorage.setItem('token', data.access)
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.access}`
      setUser({ token: data.access, user: data.user })
      return data
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
