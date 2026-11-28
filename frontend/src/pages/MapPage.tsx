import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Screen } from '../shared/components/layout/Screen'
import { Button } from '../shared/components/ui/Button'
import { RegionBoundaryMap, type SelectedRegion } from './RegionBoundaryMap'
import { useAuth } from '../features/auth/application/useAuth'
import { useGroups } from '../features/group/application/useGroups'
import { GroupSettingsSheet } from '../features/group/presentation/GroupSettingsSheet'
import { RegionExplorer, type RegionSheet } from '../features/visit/presentation/RegionExplorer'
import { useCoinDemo } from '../features/wallet/application/useCoinDemo'
import { WalletButton } from '../features/wallet/presentation/WalletButton'
import { ScreenSwitch } from './ScreenSwitch'
import styles from './Pages.module.css'

/** 지도 메인 자리. 실제 지도(MapLibre)는 지도 담당 작업이 들어오면 이 안에 붙인다. */
export function MapPage() {
  const { user } = useAuth()
  const { currentGroup, isLoading, leaveGroup, deleteGroup } = useGroups()
  const navigate = useNavigate()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null)
  const [lastFocusKey, setLastFocusKey] = useState<string | null>(null)
  const [initialSheet, setInitialSheet] = useState<RegionSheet | null>(null)
  const location = useLocation()
  useCoinDemo(currentGroup)

  // 코인 카드의 "건물 구매하러 가기"로 오면 그 동네를 열고, 시트가 정해져 있으면 그 시트까지 바로 연다.
  const focusRegion = (location.state as { focusRegion?: SelectedRegion & { sheet?: RegionSheet } } | null)?.focusRegion
  if (focusRegion && lastFocusKey !== location.key) {
    setLastFocusKey(location.key)
    setSelectedRegion({ regionCode: focusRegion.regionCode, name: focusRegion.name })
    setInitialSheet(focusRegion.sheet ?? null)
  }
  // 지도에서 직접 동네를 누르면 대표 카드부터 보여준다.
  const selectRegion = (region: SelectedRegion) => {
    setSelectedRegion(region)
    setInitialSheet(null)
  }
  useEffect(() => {
    if (!focusRegion) return
    navigate(location.pathname, { replace: true, state: null })
  }, [focusRegion, location.pathname, navigate])

  if (!currentGroup) {
    if (isLoading) {
      return (
        <Screen>
          <p className={styles.status} role="status">
            불러오는 중…
          </p>
        </Screen>
      )
    }
    return <Navigate to="/groups" replace />
  }

  const footer = (
    <div className={styles.mapFooter}>
      {selectedRegion ? (
        <RegionExplorer
          key={`${currentGroup.groupId}:${selectedRegion.regionCode}`}
          groupId={currentGroup.groupId}
          regionCode={selectedRegion.regionCode}
          regionName={selectedRegion.name}
          initialSheet={initialSheet}
          onClose={() => setSelectedRegion(null)}
        />
      ) : null}
      <div className={styles.mapTools}>
        <Button variant="primary" className={styles.uploadButton} onClick={() => navigate('/upload')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          사진 올리기
        </Button>
        <button type="button" className={styles.settingsButton} onClick={() => setIsSettingsOpen(true)}>
          설정
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
      <ScreenSwitch current="map" />
    </div>
  )

  return (
    <Screen footer={footer}>
      <div className={styles.pillRow} style={{ marginTop: -8 }}>
        <Link to="/groups" className={styles.groupPill} aria-label={`지금 그룹 ${currentGroup.name}, 그룹 바꾸기`}>
          <span className={styles.groupPillAvatar} aria-hidden="true">
            {currentGroup.name.charAt(0)}
          </span>
          <span className={styles.groupPillName}>{currentGroup.name}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A5C6B" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Link>
        <WalletButton
          key={currentGroup.groupId}
          groupId={currentGroup.groupId}
          groupName={currentGroup.name}
          fallbackBalance={currentGroup.walletBalance}
        />
      </div>
      {/* 지도의 출처 표시·버튼이 아래 고정 영역(동네 카드·사진 올리기) 위로 올라오지 않게 지도 안에 가둔다 */}
      <div className={styles.mapLayer}>
        <RegionBoundaryMap
          key={currentGroup.groupId}
          groupId={currentGroup.groupId}
          onSelectRegion={selectRegion}
        />
      </div>

      <GroupSettingsSheet
        key={currentGroup.groupId}
        group={currentGroup}
        userId={user?.userId}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onLeave={async () => {
          await leaveGroup(currentGroup.groupId)
          setIsSettingsOpen(false)
          navigate('/groups')
        }}
        onDelete={async () => {
          await deleteGroup(currentGroup.groupId)
          setIsSettingsOpen(false)
          navigate('/groups')
        }}
      />
    </Screen>
  )
}
