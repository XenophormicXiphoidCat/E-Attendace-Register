import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthBootstrap } from './components/auth/AuthBootstrap'
import { router } from './router'
import './index.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthBootstrap>
      <RouterProvider router={router} />
    </AuthBootstrap>
  </StrictMode>,
)
