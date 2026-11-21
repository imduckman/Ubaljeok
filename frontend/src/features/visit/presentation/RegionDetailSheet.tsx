import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '../../../shared/components/ui/BottomSheet'
import { Button } from '../../../shared/components/ui/Button'
import { Chip } from '../../../shared/components/ui/Chip'
import { PhotoTile } from '../../../shared/components/ui/PhotoTile'
import { describeVisits, type RegionDetailState } from '../application/useRegionDetail'
import { formatVisitDate, visiblePhotos } from '../domain/RegionDetail'
import { RegionOwnershipCard } from './RegionOwnershipCard'
import styles from './RegionDetail.module.css'

interface RegionDetailSheetProps {
  state: RegionDetailState
  /** 지도에서 받은 이름. 응답이 오기 전 제목에 쓴다. */
  regionName: string
  onRetry: () => void
  onClose: () => void
}

/** 대표 카드를 펼치면 올라오는 동네 세부 시트. 데이터는 useRegionDetail이 불러온다. */
export function RegionDetailSheet({ state, regionName, onRetry, onClose }: RegionDetailSheetProps) {
  const navigate = useNavigate()
  const [expandedVisitIds, setExpandedVisitIds] = useState<number[]>([])
  const title = state.status === 'ready' ? state.detail.region.name : regionName
  const description = state.status === 'ready' ? describeVisits(state.detail) : undefined

  return (
    <BottomSheet isOpen title={title} description={description} onClose={onClose}>
      {state.status === 'loading' ? (
        <p className={styles.status} role="status">
          불러오는 중…
        </p>
      ) : state.status === 'error' ? (
        <div className={styles.status} role="alert">
          <p>{state.message}</p>
          <Button variant="secondary" onClick={onRetry}>
            다시 불러오기
          </Button>
        </div>
      ) : (
        <>
          <RegionOwnershipCard ownership={state.ownership} />
          {state.detail.visits.length > 0 ? (
            <Button variant="secondary" className={styles.flatButton} onClick={() => navigate('/upload')}>
              사진 올리기
            </Button>
          ) : null}

          {state.detail.visits.length === 0 ? (
            <div className={styles.empty}>
              <p>아직 이 동네 사진이 없어요. 첫 발자국을 남겨볼까요?</p>
              <Button variant="primary" onClick={() => navigate('/upload')}>
                사진 올리기
              </Button>
            </div>
          ) : (
            <ul className={styles.visits}>
              {state.detail.visits.map((visit) => {
                const limit = expandedVisitIds.includes(visit.id) ? visit.photos.length : undefined
                const { shown, moreCount } = visiblePhotos(visit.photos, limit)
                const dateLabel = formatVisitDate(visit.visitDate)
                return (
                  <li key={visit.id}>
                    <div className={styles.visitHeader}>
                      <h3 className={styles.visitDate}>{dateLabel}</h3>
                      <span className={styles.rewardChip}>
                        {visit.rewardEligible ? <Chip tone="gold">코인 대상</Chip> : <Chip tone="gray">코인 제외</Chip>}
                      </span>
                    </div>
                    <div className={styles.photoGrid}>
                      {shown.map((photo, index) => (
                        <PhotoTile
                          key={photo.id}
                          src={photo.fileUrl}
                          alt={`${dateLabel} ${title} 사진`}
                          moreCount={index === shown.length - 1 ? moreCount : undefined}
                          onSelect={moreCount > 0 && index === shown.length - 1
                            ? () => setExpandedVisitIds((previous) => [...previous, visit.id])
                            : undefined}
                        />
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </BottomSheet>
  )
}
