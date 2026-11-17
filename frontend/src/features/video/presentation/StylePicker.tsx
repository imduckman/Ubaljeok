import { STYLE_OPTIONS, type DiaryStyle } from '../domain/Video'
import styles from './Video.module.css'

interface StylePickerProps {
  value: DiaryStyle
  onChange: (style: DiaryStyle) => void
}

/** 영화처럼 / 애니처럼 / 자연스럽게 / 웃기게 중 하나 */
export function StylePicker({ value, onChange }: StylePickerProps) {
  return (
    <div className={styles.styleGrid} role="radiogroup" aria-label="영상 스타일">
      {STYLE_OPTIONS.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${styles.styleCard} ${isActive ? styles.styleCardActive : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className={styles.styleLabel}>{option.label}</span>
            <span className={styles.styleDescription}>{option.description}</span>
          </button>
        )
      })}
    </div>
  )
}
