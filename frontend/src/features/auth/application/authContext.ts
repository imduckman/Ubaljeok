import { createContext } from 'react'
import type { LoginRequest, SignupRequest, User } from '../domain/User'

export interface AuthContextValue {
  user: User | null
  isCheckingSession: boolean
  login: (body: LoginRequest) => Promise<User>
  signup: (body: SignupRequest) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
