import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './BottomSheet.module.css'

interface BottomSheetProps {
  isOpen: boolean
  /** 문자열이 보통이고, 긴 이름만 줄이고 싶을 때는 요소를 넣을 수 있다. */
  title: ReactNode
  description?: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ isOpen, title, description, onClose, children }: BottomSheetProps) {
  const titleId = useId()
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // 화면 맨 바깥(body)에 그려서, 어느 칸 안에서 열어도 지도·고정 영역보다 항상 위에 오게 한다.
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  )
}
