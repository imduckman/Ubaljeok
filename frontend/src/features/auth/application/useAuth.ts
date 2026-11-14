import { useContext } from 'react'
import { AuthContext } from './authContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있어요.')
  return context
}
