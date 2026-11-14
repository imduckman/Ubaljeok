import { useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { Card } from '../../../shared/components/ui/Card'
import type { Group } from '../domain/Group'
import styles from './Group.module.css'
import codeStyles from '../../../shared/components/ui/CodeInput.module.css'

const TILE_TONES = [codeStyles.pink, codeStyles.gold, codeStyles.indigo]

export function InviteShareCard({ group }: { group: Group }) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const shareText = `우발적에서 "${group.name}" 그룹에 같이 걸어요! 초대 코드: ${group.inviteCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setStatusMessage('코드를 복사했어요.')
    } catch {
      setStatusMessage('복사하지 못했어요. 코드를 직접 알려주세요.')
    }
  }

  // 휴대폰에서는 공유 창이 열려 카카오톡 등을 고를 수 있다. 지원하지 않으면 문구를 복사한다.
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
        return
      } catch {
        return
      }
    }
    try {
      await navigator.clipboard.writeText(shareText)
      setStatusMessage('초대 문구를 복사했어요. 카카오톡에 붙여넣어 보내세요.')
    } catch {
      setStatusMessage('공유하지 못했어요. 코드를 직접 알려주세요.')
    }
  }

  return (
    <Card className={styles.inviteCard}>
      <div className={styles.inviteHeader}>
        <p className={styles.inviteLabel}>초대 코드</p>
        <p className={styles.inviteNote}>친구에게 이 코드를 보내세요</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 7 }} aria-label={`초대 코드 ${group.inviteCode.split('').join(' ')}`}>
        {group.inviteCode.split('').map((character, index) => (
          <span key={index} className={`${codeStyles.tile} ${TILE_TONES[index % TILE_TONES.length]}`} style={{ height: 58, fontSize: 26, fontWeight: 900 }} aria-hidden="true">
            {character}
          </span>
        ))}
      </div>
      <div className={styles.shareRow}>
        <Button variant="kakao" onClick={handleShare}>
          친구에게 보내기
        </Button>
        <Button variant="secondary" onClick={handleCopy}>
          코드 복사
        </Button>
      </div>
      {statusMessage ? (
        <p className={styles.status} role="status">
          {statusMessage}
        </p>
      ) : null}
    </Card>
  )
}
