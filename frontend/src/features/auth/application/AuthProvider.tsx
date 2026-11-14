import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../../../api/endpoints/auth'
import type { LoginRequest, SignupRequest, User } from '../domain/User'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    let isActive = true
    authApi
      .getMe()
      .then((currentUser) => {
        if (isActive) setUser(currentUser)
      })
      .finally(() => {
        if (isActive) setIsCheckingSession(false)
      })
    return () => {
      isActive = false
    }
  }, [])

  const login = useCallback(async (body: LoginRequest) => {
    const loggedInUser = await authApi.login(body)
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const signup = useCallback(async (body: SignupRequest) => {
    const newUser = await authApi.signup(body)
    setUser(newUser)
    return newUser
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isCheckingSession, login, signup, logout }),
    [user, isCheckingSession, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
