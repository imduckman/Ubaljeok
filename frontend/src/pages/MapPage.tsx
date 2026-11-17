import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Screen } from '../shared/components/layout/Screen'
import { RegionBoundaryMap } from './RegionBoundaryMap'
import { useAuth } from '../features/auth/application/useAuth'
import { useGroups } from '../features/group/application/useGroups'
import { GroupSettingsSheet } from '../features/group/presentation/GroupSettingsSheet'
import { ScreenSwitch } from './ScreenSwitch'
import styles from './Pages.module.css'

/** 지도 메인 자리. 실제 지도(MapLibre)는 지도 담당 작업이 들어오면 이 안에 붙인다. */
export function MapPage() {
  const { user } = useAuth()
  const { currentGroup, isLoading, leaveGroup, deleteGroup } = useGroups()
  const navigate = useNavigate()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
      <div className={styles.mapTools}>
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
        <div className={styles.walletPill} aria-label={`그룹 지갑 ${currentGroup.walletBalance ?? 0}코인`}>
          <span className={styles.walletDot} aria-hidden="true" />
          {currentGroup.walletBalance ?? 0}
          <span className={styles.walletSnap} aria-hidden="true" />
        </div>
      </div>
      <RegionBoundaryMap />

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
