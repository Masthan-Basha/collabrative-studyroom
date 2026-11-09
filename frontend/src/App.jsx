import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import StudyRoom from './pages/StudyRoom'

function RequireAuth({ children }) {
  const { user } = useAuthStore()
  return user ? children : <Navigate to="/login" replace />
}

function GuestOnly({ children }) {
  const { user } = useAuthStore()
  return !user ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"    element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/room/:roomId" element={<RequireAuth><StudyRoom /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
