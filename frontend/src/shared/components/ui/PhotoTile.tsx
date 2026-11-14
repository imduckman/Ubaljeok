import { useState } from 'react'
import styles from './PhotoTile.module.css'

export type PhotoTileStatus = 'default' | 'uploading' | 'error'

interface PhotoTileProps {
  /** 사진 주소. 고른 파일은 URL.createObjectURL(file)로 만든 주소를 넣는다. 없으면 빈 사진 칸 */
  src?: string
  /** 사진 설명. 예: 11월 13일 행궁동 사진 */
  alt: string
  /** 영상용으로 고른 순서(1부터). 값이 있으면 선택된 모양이 된다 */
  selectedOrder?: number
  /** 대표 사진 표시 */
  isCover?: boolean
  /** uploading: 흐리게 + 작은 진행 막대 / error: 빨간 테두리 + 느낌표 */
  status?: PhotoTileStatus
  /** uploading일 때 0–100. 없으면 움직이는 막대 */
  progress?: number
  /** 사진 위에 덮는 "+30" 숫자. 동네 상세의 "더 보기" 칸에 쓴다 */
  moreCount?: number
  /** 있으면 칸 전체가 버튼이 된다 */
  onSelect?: () => void
  /** 있으면 오른쪽 위에 지우기 버튼이 생긴다 */
  onRemove?: () => void
  /** 지우기 버튼을 읽어줄 문구. 기본: 사진 빼기 */
  removeLabel?: string
  className?: string
}

/**
 * 정사각형 사진 칸. 업로드 미리보기, 영상용 사진 고르기, 동네 상세 사진 목록에서 같이 쓴다.
 * 너비는 감싸는 칸(grid 등)이 정하고, 높이는 너비와 같게 맞춰진다.
 */
export function PhotoTile({
  src,
  alt,
  selectedOrder,
  isCover = false,
  status = 'default',
  progress,
  moreCount,
  onSelect,
  onRemove,
  removeLabel = '사진 빼기',
  className,
}: PhotoTileProps) {
  // 주소가 바뀌면 깨짐 표시를 다시 확인하도록 깨진 주소 자체를 기억한다
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const isSelected = selectedOrder !== undefined
  const showImage = Boolean(src) && brokenSrc !== src
  const hasMore = moreCount !== undefined && moreCount > 0

  const rootClassName = [
    styles.tile,
    isSelected ? styles.selected : '',
    status === 'error' ? styles.errorTile : '',
    onSelect ? styles.clickable : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {showImage ? (
        <img className={styles.image} src={src} alt={alt} draggable={false} onError={() => setBrokenSrc(src ?? null)} />
      ) : (
        <span className={styles.placeholder} role="img" aria-label={src ? `${alt} (불러오지 못함)` : alt}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="m21 16-4.5-4.5L8 19" />
          </svg>
        </span>
      )}

      {status === 'uploading' ? (
        <span className={styles.uploading} aria-hidden="true">
          <span className={styles.miniTrack}>
            <span
              className={`${styles.miniFill} ${progress === undefined ? styles.miniIndeterminate : ''}`}
              style={progress === undefined ? undefined : { width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </span>
        </span>
      ) : null}

      {status === 'error' ? (
        <span className={styles.errorBadge} aria-hidden="true">
          !
        </span>
      ) : null}

      {hasMore ? (
        <span className={styles.more} aria-hidden="true">
          +{moreCount}
        </span>
      ) : null}

      {isSelected ? (
        <span className={styles.order} aria-hidden="true">
          {selectedOrder}
        </span>
      ) : null}

      {isCover ? <span className={styles.cover}>대표</span> : null}
    </>
  )

  // 화면 읽기 프로그램용 상태 설명
  const stateText = [
    isSelected ? `${selectedOrder}번째로 선택됨` : '',
    isCover ? '대표 사진' : '',
    status === 'uploading' ? '올리는 중' : '',
    status === 'error' ? '올리지 못함' : '',
    hasMore ? `사진 ${moreCount}장 더 있음` : '',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className={rootClassName} aria-busy={status === 'uploading' || undefined}>
      {onSelect ? (
        <button
          type="button"
          className={styles.surface}
          onClick={onSelect}
          aria-pressed={isSelected}
          aria-label={stateText ? `${alt}, ${stateText}` : alt}
        >
          {content}
        </button>
      ) : (
        <div className={styles.surface}>
          {content}
          {stateText ? <span className={styles.srOnly}>{stateText}</span> : null}
        </div>
      )}

      {onRemove ? (
        <button type="button" className={styles.remove} onClick={onRemove} aria-label={`${removeLabel}: ${alt}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
