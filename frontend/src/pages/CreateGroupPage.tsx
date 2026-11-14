import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Screen } from '../shared/components/layout/Screen'
import { Button } from '../shared/components/ui/Button'
import { TextField } from '../shared/components/ui/TextField'
import { getErrorMessage } from '../shared/types/api'
import { useGroups } from '../features/group/application/useGroups'
import { GROUP_NAME_MAX_LENGTH, validateGroupName } from '../features/group/domain/Group'
import groupStyles from '../features/group/presentation/Group.module.css'
import styles from './Pages.module.css'

export function CreateGroupPage() {
  const { createGroup } = useGroups()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationMessage = validateGroupName(name)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const group = await createGroup({ name })
      navigate(`/groups/${group.groupId}/invite`, { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Screen background="paper">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Link to="/groups" className={styles.backLink} aria-label="그룹 목록으로 돌아가기">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className={groupStyles.title} style={{ marginTop: 16 }}>
          그룹 이름을
          <br />
          정해주세요
        </h1>
        <p className={groupStyles.subtitle}>친구들이 초대 코드를 받을 때 이 이름이 보여요.</p>
        <div style={{ marginTop: 28 }}>
          <TextField
            label={`그룹 이름 (최대 ${GROUP_NAME_MAX_LENGTH}자)`}
            name="groupName"
            placeholder="밥친구들"
            value={name}
            maxLength={GROUP_NAME_MAX_LENGTH}
            onChange={(event) => setName(event.target.value)}
            errorMessage={errorMessage ?? undefined}
          />
        </div>
        <Button type="submit" fullWidth isLoading={isSubmitting} style={{ marginTop: 'auto' }}>
          그룹 만들기
        </Button>
      </form>
    </Screen>
  )
}
