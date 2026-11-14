import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../../features/auth/application/useAuth'

function SessionChecking() {
  return (
    <p role="status" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)', fontWeight: 600 }}>
      불러오는 중…
    </p>
  )
}

/** 로그인한 사람만 들어올 수 있는 화면 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isCheckingSession } = useAuth()
  const location = useLocation()
  if (isCheckingSession) return <SessionChecking />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

/** 로그인하지 않은 사람만 보는 화면 (로그인, 회원가입) */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isCheckingSession } = useAuth()
  if (isCheckingSession) return <SessionChecking />
  if (user) return <Navigate to="/groups" replace />
  return children
}
