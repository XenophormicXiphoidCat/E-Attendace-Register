import type { ReactNode } from 'react'
import { ToastViewport } from '../feedback/ToastViewport'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_55%,_#e2e8f0_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        {children}
      </div>
      <ToastViewport />
    </div>
  )
}
