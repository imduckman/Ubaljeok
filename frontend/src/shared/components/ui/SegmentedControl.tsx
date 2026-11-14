import styles from './SegmentedControl.module.css'

interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** 두세 개 중 하나를 고르는 버튼 묶음. 예: 지도 / 그룹 화면 전환 */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className={styles.track} role="group" aria-label={label}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.segment} ${isActive ? styles.active : ''}`}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) onChange(option.value)
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
