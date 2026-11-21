import type { RegionOwnership } from '../domain/RegionDetail'
import { describeVisits, type RegionDetailState } from '../application/useRegionDetail'
import styles from './RegionPeekCard.module.css'

interface RegionPeekCardProps {
  state: RegionDetailState
  regionName: string
  onExpand: () => void
  onRetry: () => void
  onClose: () => void
}

/**
 * 지도에서 동네를 누르면 아래에 뜨는 대표 카드. 지도를 가리지 않아 다른 동네를 바로 누를 수 있다.
 * 카드를 누르면 세부 시트로 펼친다. (끌어 올리기는 5주차에 추가 예정)
 */
export function RegionPeekCard({ state, regionName, onExpand, onRetry, onClose }: RegionPeekCardProps) {
  const name = state.status === 'ready' ? state.detail.region.name : regionName

  return (
    <section className={styles.card} aria-label={`${name} 요약`}>
      {state.status === 'error' ? (
        <div className={styles.body}>
          <span className={styles.texts}>
            <span className={styles.name}>{name}</span>
            <span className={styles.meta} role="alert">
              {state.message}
            </span>
          </span>
          <button type="button" className={styles.retry} onClick={onRetry}>
            다시 불러오기
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.body} ${styles.expand}`}
          onClick={onExpand}
          disabled={state.status === 'loading'}
          aria-label={`${name} 자세히 보기`}
        >
          <span className={styles.texts}>
            <span className={styles.name}>{name}</span>
            <span className={styles.meta}>
              {state.status === 'ready' ? describeVisits(state.detail) : '불러오는 중…'}
            </span>
          </span>
          {state.status === 'ready' ? (
            <span className={`${styles.owner} ${styles[`owner_${state.ownership.status}`]}`}>
              {ownerLabel(state.ownership)}
            </span>
          ) : null}
          <span className={styles.more} aria-hidden="true">
            자세히
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      )}
      <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </section>
  )
}

function ownerLabel(ownership: RegionOwnership): string {
  switch (ownership.status) {
    case 'unowned':
      return '주인 없음'
    case 'ours':
      return ownership.level === 'landmark' ? '우리 랜드마크' : '우리 건물'
    case 'theirs':
      return `${ownership.ownerGroupName} ${ownership.level === 'landmark' ? '랜드마크' : '건물'}`
  }
}
