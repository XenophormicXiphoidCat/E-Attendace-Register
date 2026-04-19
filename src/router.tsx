import { createBrowserRouter } from 'react-router-dom'
import { AttendancePage } from './pages/AttendancePage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { StudentsPage } from './pages/StudentsPage'
import { ProtectedRoute } from './components/routing/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'attendance/:classId', element: <AttendancePage /> },
          {
            element: <ProtectedRoute adminOnly />,
            children: [
              { path: 'students/:classId', element: <StudentsPage /> },
              { path: 'history/:classId', element: <HistoryPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
