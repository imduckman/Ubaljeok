import { Chip } from '../../../shared/components/ui/Chip'
import { PhotoTile } from '../../../shared/components/ui/PhotoTile'
import { describeIneligibleReason, formatVisitDate } from '../domain/Photo'
import type { UploadItem } from '../application/usePhotoUpload'
import styles from './Photo.module.css'

interface UploadResultListProps {
  items: UploadItem[]
  onPickRegion: (id: string) => void
  onRetry: (id: string) => void
}

/** 올린 뒤 사진마다 결과: 어느 동네로 기록됐는지, 코인 대상인지, 무엇을 해야 하는지 */
export function UploadResultList({ items, onPickRegion, onRetry }: UploadResultListProps) {
  const visible = items.filter((item) => item.status !== 'invalid')

  return (
    <ul className={styles.results}>
      {visible.map((item) => (
        <li key={item.id} className={`${styles.resultRow} ${styles[`row_${item.status}`] ?? ''}`}>
          <div className={styles.resultThumb}>
            <PhotoTile
              src={item.previewUrl}
              alt={item.file.name}
              status={item.status === 'uploading' ? 'uploading' : item.status === 'failed' ? 'error' : 'default'}
            />
          </div>
          <ResultBody item={item} onPickRegion={onPickRegion} onRetry={onRetry} />
        </li>
      ))}
    </ul>
  )
}

function ResultBody({ item, onPickRegion, onRetry }: { item: UploadItem } & Omit<UploadResultListProps, 'items'>) {
  if (item.status === 'done' && item.result) {
    const { photo, visit } = item.result
    const reason = describeIneligibleReason(photo.ineligibleReason)
    return (
      <div className={styles.resultBody}>
        <p className={styles.resultTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.4" />
          </svg>
          {visit.regionName}
        </p>
        <p className={styles.resultMeta}>
          {formatVisitDate(visit.visitDate)} · {visit.isNewVisit ? '새 방문' : '같은 날 방문에 추가'}
        </p>
        {photo.rewardEligible ? <Chip tone="gold">코인 대상</Chip> : <p className={styles.resultNote}>{reason}</p>}
      </div>
    )
  }

  if (item.status === 'needsRegion') {
    return (
      <div className={styles.resultBody}>
        <p className={styles.resultTitle}>동네를 골라주세요</p>
        <p className={styles.resultNote}>{item.message} 직접 고른 동네는 코인을 받을 수 없어요.</p>
        <button type="button" className={styles.rowButton} onClick={() => onPickRegion(item.id)}>
          동네 고르기
        </button>
      </div>
    )
  }

  if (item.status === 'failed') {
    return (
      <div className={styles.resultBody}>
        <p className={`${styles.resultTitle} ${styles.errorText}`}>올리지 못했어요</p>
        <p className={styles.resultNote}>{item.message}</p>
        {item.retryable ? (
          <button type="button" className={styles.rowButton} onClick={() => onRetry(item.id)}>
            다시 올리기
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.resultBody} role="status">
      <p className={styles.resultTitle}>{item.status === 'uploading' ? '올리는 중…' : '기다리는 중'}</p>
      <p className={styles.resultMeta}>{item.file.name}</p>
    </div>
  )
}
