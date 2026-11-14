import { Navigate, useNavigate, useParams } from 'react-router'
import { Screen } from '../shared/components/layout/Screen'
import { Button } from '../shared/components/ui/Button'
import { Card } from '../shared/components/ui/Card'
import { Character } from '../shared/components/ui/Character'
import { Chip } from '../shared/components/ui/Chip'
import { useGroups } from '../features/group/application/useGroups'
import { MAX_GROUP_MEMBERS, getOwner } from '../features/group/domain/Group'
import { InviteShareCard } from '../features/group/presentation/InviteShareCard'
import groupStyles from '../features/group/presentation/Group.module.css'
import styles from './Pages.module.css'

export function GroupInvitePage() {
  const { groupId } = useParams()
  const { groups, isLoading } = useGroups()
  const navigate = useNavigate()
  const group = groups.find((item) => item.groupId === Number(groupId))

  if (!group) {
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

  const owner = getOwner(group)
  const emptySlotCount = Math.max(MAX_GROUP_MEMBERS - group.members.length, 0)

  return (
    <Screen
      footer={
        <Button variant="dark" onClick={() => navigate('/map')}>
          먼저 지도 둘러보기
        </Button>
      }
    >
      <Chip>그룹 생성 완료</Chip>
      <h1 className={groupStyles.title} style={{ marginTop: 10 }}>
        {group.name} 판이 열렸어요.
        <br />
        친구를 불러볼까요?
      </h1>

      <InviteShareCard group={group} />

      <Card style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className={groupStyles.inviteLabel}>
          멤버 {group.members.length} / {MAX_GROUP_MEMBERS}
        </p>
        <div className={groupStyles.memberSlots} aria-hidden="true">
          {group.members.map((member) => (
            <span key={member.userId} className={groupStyles.memberMe}>
              <Character size={22} />
            </span>
          ))}
          {Array.from({ length: emptySlotCount }, (_, index) => (
            <span key={index} className={groupStyles.memberSlot} />
          ))}
        </div>
        <p className={groupStyles.meta} style={{ margin: 0 }}>
          {owner ? `${owner.nickname} (그룹장)` : ''} · 친구를 기다리는 중
        </p>
      </Card>
    </Screen>
  )
}
