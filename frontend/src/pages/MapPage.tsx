import { Link, Navigate } from 'react-router'
import { Screen } from '../shared/components/layout/Screen'
import { RegionBoundaryMap } from './RegionBoundaryMap'
import { useGroups } from '../features/group/application/useGroups'
import { ScreenSwitch } from './ScreenSwitch'
import styles from './Pages.module.css'

/** 지도 메인 자리. 실제 지도(MapLibre)는 지도 담당 작업이 들어오면 이 안에 붙인다. */
export function MapPage() {
  const { currentGroup, isLoading } = useGroups()

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

  return (
    <Screen footer={<ScreenSwitch current="map" />}>
      <div className={styles.pillRow} style={{ marginTop: -8 }}>
        <Link to="/groups" className={styles.groupPill} aria-label={`지금 그룹 ${currentGroup.name}, 그룹 바꾸기`}>
          <span className={styles.groupPillAvatar} aria-hidden="true">
            {currentGroup.name.charAt(0)}
          </span>
          {currentGroup.name}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A5C6B" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Link>
        {currentGroup.walletBalance !== undefined && <div className={styles.walletPill} aria-label={`그룹 지갑 ${currentGroup.walletBalance}코인`}>
          <span className={styles.walletDot} aria-hidden="true" />
          {currentGroup.walletBalance}
          <span className={styles.walletSnap} aria-hidden="true" />
        </div>}
      </div>
      <RegionBoundaryMap />
    </Screen>
  )
}
