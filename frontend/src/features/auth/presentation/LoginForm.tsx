import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button } from '../../../shared/components/ui/Button'
import { TextField } from '../../../shared/components/ui/TextField'
import { getErrorMessage } from '../../../shared/types/api'
import { useAuth } from '../application/useAuth'
import { LoginHero } from './LoginHero'
import styles from './AuthForm.module.css'

export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!loginId || !password) {
      setErrorMessage('아이디와 비밀번호를 모두 입력하세요.')
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await login({ loginId, password })
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/groups', { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <p className={styles.brand} style={{ marginTop: 0 }}>
        偶發的
      </p>
      <h1 className={styles.appName}>우발적</h1>
      <p className={styles.lead}>
        한 칸씩 걸을 때마다
        <br />
        <span className={styles.highlight}>우리 땅</span>이 넓어져요.
      </p>
      <div style={{ marginTop: 24 }}>
        <LoginHero />
      </div>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="아이디"
          name="loginId"
          autoComplete="username"
          placeholder="footprint22"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value.trim())}
        />
        <TextField
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="8자 이상"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          errorMessage={errorMessage ?? undefined}
        />
        <Button type="submit" className={styles.submit} fullWidth isLoading={isSubmitting}>
          출발하기
        </Button>
        <p className={styles.switchLink}>
          처음이에요 · <Link to="/signup">회원가입</Link>
        </p>
      </form>
    </>
  )
}
