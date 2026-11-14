import { Screen } from '../shared/components/layout/Screen'
import { SignupForm } from '../features/auth/presentation/SignupForm'

export function SignupPage() {
  return (
    <Screen background="paper">
      <SignupForm />
    </Screen>
  )
}
