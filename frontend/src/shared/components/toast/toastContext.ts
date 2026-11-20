import { createContext } from 'react'

export type ToastTone = 'coin' | 'error' | 'info'

export interface ToastMessage {
  tone: ToastTone
  /** 굵은 첫 줄. 예: "+100 코인" */
  title: string
  /** 아래 설명 한 줄. 예: "매탄동 첫 방문으로 받았어요" */
  description?: string
}

export interface ToastContextValue {
  /** 화면 위에 알림을 잠깐(3초) 띄운다. 여러 개면 아래로 쌓인다. */
  showToast: (message: ToastMessage) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
