import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function TopBar() {
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const { currentUser, logout } = useAuthStore()

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <header className="relative z-30 mb-4 flex items-center justify-end rounded-[2rem] border border-white/70 bg-white/80 px-4 py-3 shadow-card backdrop-blur">
      {currentUser && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="flex flex-col gap-1.5">
              <span className="h-0.5 w-5 rounded-full bg-slate-900" />
              <span className="h-0.5 w-5 rounded-full bg-slate-900" />
              <span className="h-0.5 w-5 rounded-full bg-slate-900" />
            </span>
          </button>
          {open && (
            <div className="absolute right-0 top-14 z-40 min-w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                onClick={() => {
                  setOpen(false)
                  void logout()
                  navigate('/login')
                }}
              >
                <span>Logout</span>
                <span className="text-slate-400">{'>'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
