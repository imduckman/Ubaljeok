import { Screen } from '../shared/components/layout/Screen'
import { LoginForm } from '../features/auth/presentation/LoginForm'

export function LoginPage() {
  return (
    <Screen background="paper" centered>
      <LoginForm />
    </Screen>
  )
}
