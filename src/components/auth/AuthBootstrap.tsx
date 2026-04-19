import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { getProfileForActiveSession } from '../../services/attendanceService'
import { hasSupabaseEnv, supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize)
  const initialized = useAuthStore((state) => state.initialized)
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser)

  useEffect(() => {
    if (!initialized) {
      void initialize()
    }
  }, [initialize, initialized])

  useEffect(() => {
    if (!hasSupabaseEnv || !supabase) {
      return
    }

    async function syncAuthState(event: string) {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        return
      }

      const user = await getProfileForActiveSession()
      setCurrentUser(user)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      window.setTimeout(() => {
        void syncAuthState(event)
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [setCurrentUser])

  return <>{children}</>
}
