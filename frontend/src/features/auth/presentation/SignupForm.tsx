import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../../shared/components/ui/Button'
import { TextField } from '../../../shared/components/ui/TextField'
import { ApiError, getErrorMessage } from '../../../shared/types/api'
import { useAuth } from '../application/useAuth'
import { validateLoginId, validateNickname, validatePassword } from '../domain/validation'
import styles from './AuthForm.module.css'

interface FieldErrors {
  nickname?: string
  loginId?: string
  password?: string
  form?: string
}

export function SignupForm() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FieldErrors = {
      nickname: validateNickname(nickname) ?? undefined,
      loginId: validateLoginId(loginId) ?? undefined,
      password: validatePassword(password) ?? undefined,
    }
    setErrors(nextErrors)
    if (nextErrors.nickname || nextErrors.loginId || nextErrors.password) return

    setIsSubmitting(true)
    try {
      await signup({ nickname, loginId, password })
      navigate('/groups', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'LOGIN_ID_TAKEN') {
        setErrors({ loginId: error.message })
      } else {
        setErrors({ form: getErrorMessage(error) })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} style={{ flex: 1, marginTop: 0 }} onSubmit={handleSubmit} noValidate>
      <Link to="/login" className={styles.backLink} aria-label="로그인으로 돌아가기">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>
      <h1 className={styles.title}>
        함께 걸을 준비,
        <br />
        3가지만 알려주세요
      </h1>
      <p className={styles.subtitle}>닉네임은 그룹 친구들에게 보여요.</p>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <TextField
          label="닉네임"
          name="nickname"
          autoComplete="nickname"
          placeholder="승제"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          errorMessage={errors.nickname}
        />
        <TextField
          label="아이디"
          name="loginId"
          autoComplete="username"
          placeholder="영문 소문자, 숫자, _ 4–20자"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value.trim().toLowerCase())}
          errorMessage={errors.loginId}
        />
        <TextField
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="8자 이상"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          errorMessage={errors.password}
        />
      </div>
      {errors.form ? <p className={styles.formError}>{errors.form}</p> : null}
      <Button type="submit" fullWidth isLoading={isSubmitting} style={{ marginTop: 'auto' }}>
        가입하고 시작하기
      </Button>
    </form>
  )
}
