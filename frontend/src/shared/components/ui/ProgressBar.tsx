import styles from './ProgressBar.module.css'

export type ProgressTone = 'pink' | 'gold'
export type ProgressStatus = 'active' | 'error'

interface ProgressBarBaseProps {
  /** 막대 위에 보이는 문구. 화면 읽기 프로그램도 이 문구를 읽는다. 예: 사진 올리는 중 */
  label: string
  /** 오른쪽에 붙는 짧은 보조 문구. 예: 3장 중 2장 */
  caption?: string
  tone?: ProgressTone
  /** error면 막대가 멈추고 빨간색으로 바뀐다. 안내 문구는 화면에서 따로 보여준다. */
  status?: ProgressStatus
  className?: string
}

interface ValueProgressProps extends ProgressBarBaseProps {
  /** 0–100. null이면 얼마나 남았는지 모르는 상태(움직이는 막대) */
  value: number | null
  steps?: never
}

interface StepProgressProps extends ProgressBarBaseProps {
  /** 단계 수와 지금 단계(1부터). 예: 영상 생성 queued → generating → editing = { total: 3, current: 2 } */
  steps: { total: number; current: number }
  value?: never
}

export type ProgressBarProps = ValueProgressProps | StepProgressProps

const clamp = (number: number, min: number, max: number) => Math.min(Math.max(number, min), max)

/**
 * 업로드·영상 생성처럼 오래 걸리는 작업의 진행 상황.
 * - 퍼센트: <ProgressBar label="사진 올리는 중" caption="3장 중 2장" value={66} />
 * - 모름:   <ProgressBar label="준비하는 중" value={null} />
 * - 단계:   <ProgressBar label="대표 사진을 영상으로 만드는 중이에요" steps={{ total: 3, current: 2 }} />
 */
export function ProgressBar(props: ProgressBarProps) {
  const { label, caption, tone = 'pink', status = 'active', className } = props
  const isError = status === 'error'
  const rootClassName = [styles.root, styles[tone], isError ? styles.error : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  const header = (
    <div className={styles.header}>
      <span className={styles.label}>{label}</span>
      {caption ? <span className={styles.caption}>{caption}</span> : null}
    </div>
  )

  if (props.steps) {
    const total = Math.max(1, Math.round(props.steps.total))
    const current = clamp(Math.round(props.steps.current), 1, total)

    return (
      <div
        className={rootClassName}
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={`${total}단계 중 ${current}단계`}
        aria-invalid={isError || undefined}
      >
        {header}
        <div className={styles.steps}>
          {Array.from({ length: total }, (_, index) => {
            const step = index + 1
            const stepState = step < current ? styles.stepDone : step === current ? styles.stepCurrent : ''
            return <span key={step} className={`${styles.step} ${stepState}`} data-step={step} />
          })}
        </div>
      </div>
    )
  }

  const value = props.value === null ? null : clamp(props.value, 0, 100)
  const isIndeterminate = value === null

  return (
    <div
      className={rootClassName}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : Math.round(value)}
      aria-invalid={isError || undefined}
    >
      {header}
      <div className={styles.track}>
        <span
          className={`${styles.fill} ${isIndeterminate && !isError ? styles.indeterminate : ''}`}
          style={{ width: isIndeterminate ? (isError ? '100%' : undefined) : `${value}%` }}
        />
      </div>
    </div>
  )
}
