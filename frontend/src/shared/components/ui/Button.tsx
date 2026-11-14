import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'kakao'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  isLoading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classNames = [styles.button, styles[variant], fullWidth ? styles.fullWidth : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classNames} disabled={disabled || isLoading} aria-busy={isLoading} {...rest}>
      {isLoading ? '잠시만요…' : children}
    </button>
  )
}
