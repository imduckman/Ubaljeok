import type { ReactNode } from 'react'
import styles from './Chip.module.css'

interface ChipProps {
  tone?: 'pink' | 'gold'
  children: ReactNode
}

export function Chip({ tone = 'pink', children }: ChipProps) {
  return <span className={`${styles.chip} ${styles[tone]}`}>{children}</span>
}
