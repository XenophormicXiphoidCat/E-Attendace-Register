import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const location = useLocation()
  const currentUser = useAuthStore((state) => state.currentUser)
  const initialized = useAuthStore((state) => state.initialized)

  if (!initialized) {
    return <div className="rounded-3xl bg-white/85 p-6 shadow-card">Loading session...</div>
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (adminOnly && currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
