import { useId, useRef } from 'react'
import styles from './CodeInput.module.css'

const TILE_TONES = ['pink', 'gold', 'indigo'] as const

interface CodeInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  length?: number
  errorMessage?: string
}

/** 6칸 타일 모양의 초대 코드 입력. 실제 입력은 숨겨진 input 하나가 받는다. */
export function CodeInput({ label, value, onChange, length = 6, errorMessage }: CodeInputProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const characters = Array.from({ length }, (_, index) => value[index] ?? '')

  const handleChange = (rawValue: string) => {
    const cleaned = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, length)
    onChange(cleaned)
  }

  return (
    <div className={styles.wrapper}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.tiles} onClick={() => inputRef.current?.focus()}>
        {characters.map((character, index) => {
          const isActive = index === value.length
          const tone = TILE_TONES[index % TILE_TONES.length]
          const toneClass = character ? styles[tone] : styles.empty
          return (
            <span key={index} className={`${styles.tile} ${isActive ? styles.active : toneClass}`} aria-hidden="true">
              {character || (isActive ? <span className={styles.cursor} /> : null)}
            </span>
          )
        })}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        className={styles.hiddenInput}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        maxLength={length}
        autoComplete="off"
        autoCapitalize="characters"
        inputMode="text"
        aria-invalid={Boolean(errorMessage)}
      />
      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
    </div>
  )
}
