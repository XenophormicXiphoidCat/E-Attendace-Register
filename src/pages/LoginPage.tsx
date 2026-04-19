import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasSupabaseEnv } from '../lib/supabase'
import { registerPushNotifications } from '../services/pushService'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const loginWithPassword = useAuthStore((state) => state.loginWithPassword)
  const loading = useAuthStore((state) => state.loading)
  const currentUser = useAuthStore((state) => state.currentUser)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!currentUser) {
      return
    }
    void registerPushNotifications(currentUser.id)
    navigate(currentUser.role === 'admin' ? '/dashboard' : `/attendance/${currentUser.assigned_class_id}`)
  }, [currentUser, navigate])

  async function handleLogin(role: 'admin' | 'teacher') {
    try {
      setError('')
      const user = await login(role)
      if (user) {
        await registerPushNotifications(user.id)
        navigate(user.role === 'admin' ? '/dashboard' : `/attendance/${user.assigned_class_id}`)
      }
    } catch {
      setError('Login failed. Please verify your account details or use the pilot access options.')
    }
  }

  async function handleAccountLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setError('')
      const user = await loginWithPassword(email, password)
      if (user) {
        return
      }
      setError('Sign-in succeeded, but no matching app profile was returned.')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.')
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-4 sm:px-6">
      <section className="mx-auto w-full max-w-[30rem] rounded-[2.25rem] border border-slate-200 bg-white p-4 shadow-card">
        <div className="rounded-[1.85rem] border border-slate-200 bg-white px-5 py-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:px-7 sm:py-7">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.3rem] bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.22)]">
              <span className="text-base font-semibold tracking-[0.2em]">AH</span>
            </div>
            <p className="mt-3 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-slate-600">
              Attendance
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Sign in</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
              {hasSupabaseEnv
                ? 'Continue to the attendance dashboard with your school account.'
                : 'Pilot access is enabled for one teacher account and one admin account.'}
            </p>
          </div>

          {hasSupabaseEnv ? (
            <form className="mx-auto mt-6 max-w-sm space-y-3.5" onSubmit={handleAccountLogin}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-300 bg-slate-100 px-4 py-3 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  placeholder="name@school.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-300 bg-slate-100 px-4 py-3 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  placeholder="Enter your password"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-[1rem] bg-sky-600 px-5 py-3 text-white shadow-[0_18px_35px_rgba(2,132,199,0.3)] transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="block text-lg font-semibold">{loading ? 'Signing in...' : 'Sign in'}</span>
              </button>
            </form>
          ) : (
            <div className="mx-auto mt-6 max-w-sm space-y-3.5">
              <button
                type="button"
                onClick={() => void handleLogin('teacher')}
                className="w-full rounded-[1rem] border border-emerald-300 bg-emerald-50 px-5 py-3.5 text-left transition hover:bg-emerald-100"
              >
                <span className="block text-xs uppercase tracking-[0.3em] text-emerald-700">Teacher</span>
                <span className="mt-2 block text-lg font-semibold text-slate-950">Open assigned class</span>
              </button>

              <button
                type="button"
                onClick={() => void handleLogin('admin')}
                className="w-full rounded-[1rem] border border-slate-300 bg-slate-950 px-5 py-3.5 text-left text-white transition hover:bg-slate-800"
              >
                <span className="block text-xs uppercase tracking-[0.3em] text-slate-300">Admin</span>
                <span className="mt-2 block text-lg font-semibold">Open dashboard</span>
              </button>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-[1.15rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
