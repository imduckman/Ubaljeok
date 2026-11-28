import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '../../../shared/components/ui/BottomSheet'
import { Button } from '../../../shared/components/ui/Button'
import { Chip } from '../../../shared/components/ui/Chip'
import { PhotoTile } from '../../../shared/components/ui/PhotoTile'
import { PropertyGrowthCard } from '../../game/presentation/PropertyGrowthCard'
import { describeVisits, type RegionDetailState } from '../application/useRegionDetail'
import { formatVisitDate, visiblePhotos, type RegionOwnership } from '../domain/RegionDetail'
import styles from './RegionDetail.module.css'

/** 동네 상세 시트의 두 탭 */
export type RegionTab = 'gallery' | 'building'

const TAB_OPTIONS: { value: RegionTab; label: string }[] = [
  { value: 'gallery', label: '갤러리' },
  { value: 'building', label: '건물 관리' },
]

interface RegionDetailSheetProps {
  state: RegionDetailState
  /** 지도에서 받은 이름. 응답이 오기 전 제목에 쓴다. */
  regionName: string
  tab: RegionTab
  onTabChange: (tab: RegionTab) => void
  /** 없으면 건물 관리 탭에서 구매 버튼 없이 성장 길만 보여준다 */
  groupId?: number
  onOwnershipChange?: (ownership: RegionOwnership) => void
  onRetry: () => void
  onClose: () => void
}

/**
 * 동네 상세 시트. 위쪽 탭(밑줄 표시)으로 [갤러리](날짜별 사진·사진 올리기)와 [건물 관리](성장 길·구매)를 나눈다.
 * 두 탭 내용을 같은 자리에 겹쳐 두고 안 보이는 쪽만 숨겨서, 탭을 바꿔도 시트 높이가 그대로다.
 */
export function RegionDetailSheet({
  state,
  regionName,
  tab,
  onTabChange,
  groupId,
  onOwnershipChange,
  onRetry,
  onClose,
}: RegionDetailSheetProps) {
  const navigate = useNavigate()
  const idPrefix = useId()
  const tabRefs = useRef<Partial<Record<RegionTab, HTMLButtonElement | null>>>({})
  const [expandedVisitIds, setExpandedVisitIds] = useState<number[]>([])
  const title = state.status === 'ready' ? state.detail.region.name : regionName
  const description = state.status === 'ready' ? describeVisits(state.detail) : undefined

  return (
    <BottomSheet isOpen title={title} description={description} onClose={onClose}>
      <div className={styles.tabBar} role="tablist" aria-label="동네 상세 보기">
        {TAB_OPTIONS.map((option) => {
          const isActive = option.value === tab
          return (
            <button
              key={option.value}
              ref={(element) => {
                tabRefs.current[option.value] = element
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${option.value}`}
              aria-selected={isActive}
              aria-controls={`${idPrefix}-panel-${option.value}`}
              tabIndex={isActive ? 0 : -1}
              className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
              onClick={() => {
                if (!isActive) onTabChange(option.value)
              }}
              onKeyDown={moveTabWithArrows}
            >
              {option.label}
            </button>
          )
        })}
      </div>

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
        <div className={styles.panels}>
          {panel(
            'gallery',
            <>
          {state.detail.visits.length === 0 ? (
            <div className={styles.empty}>
              <p>아직 이 동네 사진이 없어요. 첫 발자국을 남겨볼까요?</p>
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
              {/* 사진 올리기: 갤러리 맨 아래에 고정. 사진을 내려 봐도 항상 보인다 */}
              <div className={styles.stickyFooter}>
                <Button variant="secondary" className={styles.flatButton} onClick={() => navigate('/upload')}>
                  사진 올리기
                </Button>
              </div>
            </>,
          )}
          {panel(
            'building',
            <PropertyGrowthCard
              detail={state.detail}
              ownership={state.ownership}
              groupId={groupId}
              onOwnershipChange={onOwnershipChange}
            />,
          )}
        </div>
      )}
    </BottomSheet>
  )

  /** 두 탭 내용은 겹쳐 두고, 안 보이는 쪽은 자리만 차지하게 숨긴다(누를 수도, 읽히지도 않음) */
  function panel(value: RegionTab, children: ReactNode) {
    const isActive = value === tab
    return (
      <div
        role="tabpanel"
        id={`${idPrefix}-panel-${value}`}
        aria-labelledby={`${idPrefix}-tab-${value}`}
        aria-hidden={isActive ? undefined : true}
        inert={!isActive}
        className={`${styles.panel} ${styles[`panel_${value}`]} ${isActive ? '' : styles.panelHidden}`}
      >
        {children}
      </div>
    )
  }

  /** ← → 키로 탭 이동 */
  function moveTabWithArrows(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const index = TAB_OPTIONS.findIndex((option) => option.value === tab)
    const step = event.key === 'ArrowRight' ? 1 : -1
    const next = TAB_OPTIONS[(index + step + TAB_OPTIONS.length) % TAB_OPTIONS.length].value
    onTabChange(next)
    tabRefs.current[next]?.focus()
  }
}
