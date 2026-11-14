import type { ReactNode } from 'react'
import styles from './Screen.module.css'

interface ScreenProps {
  background?: 'page' | 'paper'
  centered?: boolean
  footer?: ReactNode
  children: ReactNode
}

/** 휴대폰 폭에 맞춘 화면 틀. footer는 화면 아래에 고정되는 버튼 영역. */
export function Screen({ background = 'page', centered = false, footer, children }: ScreenProps) {
  return (
    <div className={`${styles.screen} ${styles[background]}`}>
      <main className={`${styles.content} ${centered ? styles.centered : ''}`}>{children}</main>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  )
}
