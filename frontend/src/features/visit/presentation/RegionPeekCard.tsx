import { useNavigate } from 'react-router'
import { PhotoTile } from '../../../shared/components/ui/PhotoTile'
import type { RegionOwnership } from '../domain/RegionDetail'
import { describeVisits, type RegionDetailState } from '../application/useRegionDetail'
import styles from './RegionPeekCard.module.css'

/** 대표 카드에 미리 보여줄 사진 칸 수. 넘치면 마지막 칸이 "+N"이 된다. */
const PREVIEW_COUNT = 4

interface RegionPeekCardProps {
  state: RegionDetailState
  regionName: string
  onOpenGallery: () => void
  onOpenBuilding: () => void
  onRetry: () => void
  onClose: () => void
}

/**
 * 지도에서 동네를 누르면 아래에 뜨는 대표 카드. 지도를 가리지 않아 다른 동네를 바로 누를 수 있다.
 * 최근 사진 미리보기와 [갤러리] [건물 관리] 버튼으로 상세 시트를 해당 탭으로 연다.
 */
export function RegionPeekCard({ state, regionName, onOpenGallery, onOpenBuilding, onRetry, onClose }: RegionPeekCardProps) {
  const name = state.status === 'ready' ? state.detail.region.name : regionName
  const photos = state.status === 'ready' ? state.detail.visits.flatMap((visit) => visit.photos) : []
  const navigate = useNavigate()
  const hasPhotos = photos.length > 0
  const preview = photos.slice(0, PREVIEW_COUNT)
  // 정사각형 4칸. 1~3장이면 왼쪽부터 사진, 그 뒤는 회색 빈칸, 4번째 칸은 '사진 더 올리기'
  const hasAddSlot = preview.length < PREVIEW_COUNT
  const blankSlots = hasAddSlot ? PREVIEW_COUNT - 1 - preview.length : 0
  const moreCount = photos.length > PREVIEW_COUNT ? photos.length - PREVIEW_COUNT + 1 : 0

  return (
    <section className={styles.card} aria-label={`${name} 요약`}>
      <div className={styles.header}>
        <span className={styles.texts}>
          <span className={styles.name}>{name}</span>
          {state.status === 'error' ? (
            <span className={styles.meta} role="alert">
              {state.message}
            </span>
          ) : (
            <span className={styles.meta}>
              {state.status === 'ready'
                ? `${describeVisits(state.detail)}${photos.length > 0 ? ` · 사진 ${photos.length}장` : ''}`
                : '불러오는 중…'}
            </span>
          )}
        </span>
        {state.status === 'ready' ? (
          <span className={`${styles.owner} ${styles[`owner_${state.ownership.status}`]}`}>{ownerLabel(state.ownership)}</span>
        ) : null}
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {state.status === 'error' ? (
        <button type="button" className={styles.retry} onClick={onRetry}>
          다시 불러오기
        </button>
      ) : (
        <>
          {state.status === 'loading' ? (
            <div className={styles.preview} aria-hidden="true">
              {Array.from({ length: PREVIEW_COUNT }, (_, index) => (
                <span key={index} className={styles.loadingTile} />
              ))}
            </div>
          ) : preview.length > 0 ? (
            <div className={styles.preview}>
              {preview.map((photo, index) => {
                const isLast = index === preview.length - 1
                return (
                  <PhotoTile
                    key={photo.id}
                    src={photo.fileUrl}
                    alt={`${name} 사진`}
                    moreCount={isLast ? moreCount : undefined}
                    onSelect={onOpenGallery}
                  />
                )
              })}
              {Array.from({ length: blankSlots }, (_, index) => (
                <span key={`blank-${index}`} className={styles.blankTile} aria-hidden="true" />
              ))}
              {hasAddSlot ? (
                <button type="button" className={styles.addTile} onClick={() => navigate('/upload')} aria-label="사진 더 올리기">
                  <span className={styles.addPlus} aria-hidden="true">＋</span>
                  <span aria-hidden="true">더 올리기</span>
                </button>
              ) : null}
            </div>
          ) : (
            <button type="button" className={styles.emptyTile} onClick={() => navigate('/upload')}>
              아직 사진이 없어요 · 첫 사진 올리기
            </button>
          )}
          {/* 불러오는 중에는 숨기고, 사진을 올린 적 없는 동네는 회색으로 비활성화 (점선 칸으로 사진 올리기만) */}
          {state.status !== 'ready' ? null : (
            <div className={styles.actions}>
              <button type="button" className={styles.galleryButton} onClick={onOpenGallery} disabled={!hasPhotos}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <circle cx="9" cy="10" r="1.6" />
                  <path d="m21 16-4.5-4.5L8 19" />
                </svg>
                갤러리
              </button>
              <button type="button" className={styles.buildingButton} onClick={onOpenBuilding} disabled={!hasPhotos}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 20V10l8-6 8 6v10" />
                  <path d="M10 20v-5h4v5" />
                  <path d="M2.5 20h19" />
                </svg>
                건물 관리
              </button>
            </div>
          )}
        </>
      )}
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
