import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from '../api/auth'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Optimistic: if a token is in storage, treat user as authenticated immediately.
  // A background /me call silently revokes it if the token is expired/invalid.
  const hasToken = !!localStorage.getItem('token')
  const [isAuthenticated, setIsAuthenticated] = useState(hasToken)
  const isLoading = false

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    authApi.me().catch(() => {
      localStorage.removeItem('token')
      setIsAuthenticated(false)
    })
  }, [])

  const login = (token: string) => {
    localStorage.setItem('token', token)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
