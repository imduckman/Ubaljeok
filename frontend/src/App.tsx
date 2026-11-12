import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './features/auth/application/AuthProvider'
import { GroupProvider } from './features/group/application/GroupProvider'
import { GuestOnly, RequireAuth } from './shared/components/auth/RouteGuards'
import { CreateGroupPage } from './pages/CreateGroupPage'
import { GroupInvitePage } from './pages/GroupInvitePage'
import { GroupsPage } from './pages/GroupsPage'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import { SignupPage } from './pages/SignupPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/groups" replace />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
      <Route path="/groups" element={<RequireAuth><GroupsPage /></RequireAuth>} />
      <Route path="/groups/new" element={<RequireAuth><CreateGroupPage /></RequireAuth>} />
      <Route path="/groups/:groupId/invite" element={<RequireAuth><GroupInvitePage /></RequireAuth>} />
      <Route path="/map" element={<RequireAuth><MapPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GroupProvider>
          <AppRoutes />
        </GroupProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
