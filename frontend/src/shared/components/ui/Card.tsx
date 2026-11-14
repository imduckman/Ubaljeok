import type { HTMLAttributes } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  isSelected?: boolean
}

export function Card({ isSelected = false, className, children, ...rest }: CardProps) {
  const classNames = [styles.card, isSelected ? styles.selected : '', className ?? ''].filter(Boolean).join(' ')

  return (
    <div className={classNames} {...rest}>
      {children}
    </div>
  )
}
