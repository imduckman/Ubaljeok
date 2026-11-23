import { useContext } from 'react'
import { ToastContext } from './toastContext'

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast는 ToastProvider 안에서만 쓸 수 있어요.')
  return context
}
