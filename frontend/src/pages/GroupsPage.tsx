import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../shared/components/layout/Screen'
import { Button } from '../shared/components/ui/Button'
import { useAuth } from '../features/auth/application/useAuth'
import { useGroups } from '../features/group/application/useGroups'
import { EmptyGroups } from '../features/group/presentation/EmptyGroups'
import { GroupCard } from '../features/group/presentation/GroupCard'
import { JoinGroupSheet } from '../features/group/presentation/JoinGroupSheet'
import groupStyles from '../features/group/presentation/Group.module.css'
import { ScreenSwitch } from './ScreenSwitch'
import styles from './Pages.module.css'

const FOOTER_BUTTON_STYLE = { fontSize: 17.5 }

export function GroupsPage() {
  const { user, logout } = useAuth()
  const { groups, currentGroup, isLoading, loadErrorMessage, refreshGroups, selectGroup } = useGroups()
  const navigate = useNavigate()
  const [isJoinSheetOpen, setIsJoinSheetOpen] = useState(false)
  // 카드를 누르면 펼쳐지기만 하고, '그룹으로 이동'을 눌러야 지금 그룹이 바뀐다.
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const nickname = user?.nickname ?? ''
  const hasGroups = groups.length > 0
  const expandedGroupId = selectedGroupId ?? currentGroup?.groupId ?? null

  const handleEnterGroup = (groupId: number) => {
    selectGroup(groupId)
    navigate('/map')
  }

  const footer = (
    <div className={groupStyles.footerStack}>
      {hasGroups ? <ScreenSwitch current="groups" /> : null}
      <div className={groupStyles.footerButtons}>
        <Button variant={hasGroups ? 'secondary' : 'primary'} style={FOOTER_BUTTON_STYLE} onClick={() => navigate('/groups/new')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          새 그룹 만들기
        </Button>
        <Button variant={hasGroups ? 'primary' : 'secondary'} style={FOOTER_BUTTON_STYLE} onClick={() => setIsJoinSheetOpen(true)}>
          코드로 참여하기
        </Button>
      </div>
    </div>
  )

  return (
    <Screen footer={footer}>
      <div className={styles.topBar}>
        <span />
        <button type="button" className={styles.textButton} onClick={() => void logout()}>
          로그아웃
        </button>
      </div>

      {isLoading && !hasGroups ? (
        <p className={styles.status} role="status">
          그룹을 불러오는 중…
        </p>
      ) : loadErrorMessage ? (
        <div className={styles.status} role="alert">
          <p>{loadErrorMessage}</p>
          <Button variant="secondary" onClick={() => void refreshGroups()}>
            다시 불러오기
          </Button>
        </div>
      ) : hasGroups ? (
        <>
          <p className={groupStyles.greeting}>{nickname}님, 반가워요</p>
          <h1 className={groupStyles.title}>
            오늘은 어느 그룹으로
            <br />
            걸어볼까요?
          </h1>
          <ul className={groupStyles.list}>
            {groups.map((group, index) => (
              <li key={group.groupId}>
                <GroupCard
                  group={group}
                  index={index}
                  isCurrent={group.groupId === currentGroup?.groupId}
                  isSelected={group.groupId === expandedGroupId}
                  onSelect={() => setSelectedGroupId(group.groupId)}
                  onEnter={() => handleEnterGroup(group.groupId)}
                />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyGroups nickname={nickname} />
      )}

      <JoinGroupSheet
        isOpen={isJoinSheetOpen}
        onClose={() => setIsJoinSheetOpen(false)}
        onJoined={() => {
          setIsJoinSheetOpen(false)
          navigate('/map')
        }}
      />
    </Screen>
  )
}
