import { Card } from '../../../shared/components/ui/Card'
import { Chip } from '../../../shared/components/ui/Chip'
import type { Group } from '../domain/Group'
import styles from './Group.module.css'

const MAX_VISIBLE_FACES = 3
const FACE_STYLES = [
  { background: 'var(--us)', color: 'var(--paper)' },
  { background: 'var(--coin)', color: '#5c3d00' },
  { background: 'var(--them)', color: 'var(--paper)' },
]
const AVATAR_CLASSES = [styles.avatarLight, styles.avatarIndigo]

interface GroupCardProps {
  group: Group
  index: number
  isCurrent: boolean
  isSelected: boolean
  onSelect: () => void
  onEnter: () => void
}

export function GroupCard({ group, index, isCurrent, isSelected, onSelect, onEnter }: GroupCardProps) {
  const avatarClass = isSelected ? styles.avatarPink : AVATAR_CLASSES[index % AVATAR_CLASSES.length]
  const visibleMembers = group.members.slice(0, MAX_VISIBLE_FACES)
  const hasMoreMembers = group.members.length > MAX_VISIBLE_FACES
  const allNames = group.members.map((member) => member.nickname).join(', ')
  const memberNames = hasMoreMembers
    ? `${group.members.slice(0, MAX_VISIBLE_FACES).map((member) => member.nickname).join(', ')} 외 ${group.members.length - MAX_VISIBLE_FACES}명`
    : allNames

  return (
    <Card isSelected={isSelected}>
      <button type="button" className={styles.cardButton} onClick={onSelect} aria-expanded={isSelected}>
        <div className={styles.cardRow}>
          <span className={`${styles.avatar} ${avatarClass}`} aria-hidden="true">
            {group.name.charAt(0)}
          </span>
          <div className={styles.cardBody}>
            <div className={styles.nameRow}>
              <span className={styles.groupName}>{group.name}</span>
              {isCurrent ? <Chip>지금 그룹</Chip> : null}
            </div>
            <p className={styles.meta}>
              멤버 {group.members.length}명 · 동네 {group.visitedRegionCount}칸
            </p>
          </div>
          <span className={styles.coin} aria-label={`코인 ${group.walletBalance}`}>
            <span className={styles.coinDot} aria-hidden="true" />
            {group.walletBalance}
          </span>
        </div>
      </button>

      {isSelected ? (
        <>
          <div className={styles.members}>
            <span className={styles.faces} aria-hidden="true">
              {visibleMembers.map((member, memberIndex) => (
                <span key={member.userId} className={styles.face} style={FACE_STYLES[memberIndex % FACE_STYLES.length]}>
                  {member.nickname.charAt(0)}
                </span>
              ))}
              {hasMoreMembers ? <span className={`${styles.face} ${styles.faceMore}`}>+</span> : null}
            </span>
            <span className={styles.memberNames} title={allNames}>
              {memberNames}
            </span>
            <button type="button" className={styles.enterButton} onClick={onEnter} aria-label={`${group.name} 그룹으로 이동`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </>
      ) : null}
    </Card>
  )
}
