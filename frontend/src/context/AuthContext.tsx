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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    console.debug('[AuthProvider] init, token=', token)
    if (token) {
      authApi.me()
        .then(() => setIsAuthenticated(true))
        .catch(() => {
          localStorage.removeItem('token')
          setIsAuthenticated(false)
        })
        .finally(() => setIsLoading(false))
    } else {
      console.debug('[AuthProvider] no token, marking not authenticated')
      setIsLoading(false)
    }
  }, [])

  const login = (token: string) => {
    localStorage.setItem('token', token)
    console.debug('[AuthProvider] login, token set')
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem('token')
    console.debug('[AuthProvider] logout, token removed')
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
