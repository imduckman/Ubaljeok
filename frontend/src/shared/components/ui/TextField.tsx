import { useId, type InputHTMLAttributes } from 'react'
import styles from './TextField.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  errorMessage?: string
  helperMessage?: string
}

export function TextField({ label, errorMessage, helperMessage, id, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const hasError = Boolean(errorMessage)
  const message = errorMessage ?? helperMessage

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={`${styles.input} ${hasError ? styles.inputError : ''}`}
        aria-invalid={hasError}
        aria-describedby={message ? messageId : undefined}
        {...rest}
      />
      {message ? (
        <p id={messageId} className={hasError ? styles.error : styles.helper}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
