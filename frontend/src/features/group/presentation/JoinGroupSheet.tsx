import { useState, type FormEvent } from 'react'
import { BottomSheet } from '../../../shared/components/ui/BottomSheet'
import { Button } from '../../../shared/components/ui/Button'
import { CodeInput } from '../../../shared/components/ui/CodeInput'
import { getErrorMessage } from '../../../shared/types/api'
import { useGroups } from '../application/useGroups'
import { INVITE_CODE_LENGTH, type Group } from '../domain/Group'

interface JoinGroupSheetProps {
  isOpen: boolean
  onClose: () => void
  onJoined: (group: Group) => void
}

export function JoinGroupSheet({ isOpen, onClose, onJoined }: JoinGroupSheetProps) {
  const { joinGroup } = useGroups()
  const [inviteCode, setInviteCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setInviteCode('')
    setErrorMessage(null)
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inviteCode.length !== INVITE_CODE_LENGTH) {
      setErrorMessage(`${INVITE_CODE_LENGTH}자리 코드를 모두 입력하세요.`)
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const group = await joinGroup({ inviteCode })
      setInviteCode('')
      onJoined(group)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="초대 코드로 참여하기"
      description={`친구에게 받은 ${INVITE_CODE_LENGTH}자리 코드를 입력하세요.`}
    >
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <CodeInput
          label="초대 코드"
          value={inviteCode}
          onChange={(value) => {
            setInviteCode(value)
            setErrorMessage(null)
          }}
          length={INVITE_CODE_LENGTH}
          errorMessage={errorMessage ?? undefined}
        />
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          그룹 참여하기
        </Button>
      </form>
    </BottomSheet>
  )
}
