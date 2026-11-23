import { useState } from 'react'
import { BottomSheet } from '../../../shared/components/ui/BottomSheet'
import { Button } from '../../../shared/components/ui/Button'
import { Chip } from '../../../shared/components/ui/Chip'
import { getErrorMessage } from '../../../shared/types/api'
import { MAX_GROUP_MEMBERS, getNextOwner, isGroupOwner, type Group } from '../domain/Group'
import styles from './GroupSettingsSheet.module.css'

type Step = 'menu' | 'confirmLeave' | 'confirmDelete'

interface GroupSettingsSheetProps {
  group: Group
  userId: number | undefined
  isOpen: boolean
  onClose: () => void
  onLeave: () => Promise<void>
  onDelete: () => Promise<void>
}

/** 지도 화면의 ⚙ 버튼으로 여는 그룹 설정. 멤버 보기, 초대 코드 복사, 나가기, 삭제(그룹장만). */
export function GroupSettingsSheet({ group, userId, isOpen, onClose, onLeave, onDelete }: GroupSettingsSheetProps) {
  const [step, setStep] = useState<Step>('menu')
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const isOwner = isGroupOwner(group, userId)
  const isAlone = group.members.length === 1

  const close = () => {
    if (isBusy) return
    setStep('menu')
    setMessage(null)
    onClose()
  }

  const goTo = (next: Step) => {
    setStep(next)
    setMessage(null)
  }

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true)
    setMessage(null)
    try {
      await action()
    } catch (error) {
      setMessage(getErrorMessage(error))
      setIsBusy(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setMessage('코드를 복사했어요.')
    } catch {
      setMessage('복사하지 못했어요. 코드를 직접 알려주세요.')
    }
  }

  if (step === 'confirmLeave') {
    const nextOwner = userId === undefined ? undefined : getNextOwner(group, userId)
    const description = isAlone
      ? '혼자 남은 그룹이라 나가면 그룹이 삭제돼요. 이 그룹의 건물·랜드마크는 주인 없는 땅이 돼요.'
      : isOwner && nextOwner
        ? `가장 먼저 들어온 ${nextOwner.nickname}님이 그룹장이 돼요. 다시 들어오려면 초대 코드가 필요해요.`
        : '다시 들어오려면 초대 코드가 필요해요.'
    return (
      <BottomSheet isOpen={isOpen} title={
          <>
            <span className={styles.nameClip}>{group.name}</span>에서 나갈까요?
          </>
        } description={description} onClose={close}>
        <ConfirmActions
          confirmLabel="나가기"
          isBusy={isBusy}
          message={message}
          onCancel={() => goTo('menu')}
          onConfirm={() => void run(onLeave)}
        />
      </BottomSheet>
    )
  }

  if (step === 'confirmDelete') {
    return (
      <BottomSheet
        isOpen={isOpen}
        title={
          <>
            <span className={styles.nameClip}>{group.name}</span> 그룹을 삭제할까요?
          </>
        }
        description="멤버 모두가 이 그룹에서 빠지고, 되돌릴 수 없어요. 이 그룹의 건물·랜드마크는 주인 없는 땅이 돼요."
        onClose={close}
      >
        <ConfirmActions
          confirmLabel="삭제하기"
          isBusy={isBusy}
          message={message}
          onCancel={() => goTo('menu')}
          onConfirm={() => void run(onDelete)}
        />
      </BottomSheet>
    )
  }

  return (
    <BottomSheet isOpen={isOpen} title={<span className={styles.nameClip}>{group.name}</span>} description={`멤버 ${group.members.length} / ${MAX_GROUP_MEMBERS}`} onClose={close}>
      <ul className={styles.members}>
        {group.members.map((member) => (
          <li key={member.userId} className={styles.member}>
            <span className={styles.memberAvatar} aria-hidden="true">
              {member.nickname.charAt(0)}
            </span>
            <span className={styles.memberName}>
              {member.nickname}
              {member.userId === userId ? <span className={styles.me}> (나)</span> : null}
            </span>
            {member.role === 'OWNER' ? <Chip>그룹장</Chip> : null}
          </li>
        ))}
      </ul>

      <div className={styles.inviteRow}>
        <div>
          <p className={styles.inviteLabel}>초대 코드</p>
          <p className={styles.inviteCode}>{group.inviteCode}</p>
        </div>
        <Button variant="secondary" className={styles.copyButton} onClick={() => void handleCopy()}>
          코드 복사
        </Button>
      </div>

      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}

      <div className={styles.dangerZone}>
        <button type="button" className={styles.dangerText} onClick={() => goTo('confirmLeave')}>
          그룹 나가기
        </button>
        {isOwner ? (
          <button type="button" className={styles.dangerText} onClick={() => goTo('confirmDelete')}>
            그룹 삭제
          </button>
        ) : null}
      </div>
    </BottomSheet>
  )
}

interface ConfirmActionsProps {
  confirmLabel: string
  isBusy: boolean
  message: string | null
  onCancel: () => void
  onConfirm: () => void
}

function ConfirmActions({ confirmLabel, isBusy, message, onCancel, onConfirm }: ConfirmActionsProps) {
  return (
    <>
      {message ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
      <div className={styles.confirmRow}>
        <Button variant="secondary" disabled={isBusy} onClick={onCancel}>
          취소
        </Button>
        <Button variant="primary" className={styles.dangerButton} isLoading={isBusy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </>
  )
}
