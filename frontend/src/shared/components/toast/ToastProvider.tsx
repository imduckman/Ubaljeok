import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastMessage } from './toastContext'
import styles from './Toast.module.css'

/** 알림이 떠 있는 시간 (UI-STATES: 3초) */
export const TOAST_DURATION_MS = 3000
/** 한 번에 보이는 알림 수. 넘치면 오래된 것부터 사라진다. */
const MAX_VISIBLE = 3

interface ToastItem extends ToastMessage {
  id: number
}

/**
 * 앱 맨 위에서 한 번 감싼다. 어느 화면에서든 useToast().showToast({...})로 알림을 띄운다.
 * 스타일가이드: 상단, 둥글기 18px, 아이콘 40px + 제목 + 설명.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer !== undefined) window.clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const showToast = useCallback(
    (message: ToastMessage) => {
      const id = nextId.current++
      setToasts((previous) => [...previous, { ...message, id }].slice(-MAX_VISIBLE))
      timers.current.set(id, window.setTimeout(() => dismiss(id), TOAST_DURATION_MS))
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={styles.toast}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            onClick={() => dismiss(toast.id)}
          >
            <span className={`${styles.icon} ${styles[toast.tone]}`} aria-hidden="true">
              {toast.tone === 'coin' ? <span className={styles.coinDot} /> : toast.tone === 'error' ? '!' : '✓'}
            </span>
            <span className={styles.texts}>
              <span className={styles.title}>{toast.title}</span>
              {toast.description ? <span className={styles.description}>{toast.description}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
