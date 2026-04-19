import { create } from 'zustand'
import { loginAs, loginWithPassword, logoutUser, restoreSession } from '../services/attendanceService'
import type { UserProfile, UserRole } from '../types/domain'

interface AuthState {
  currentUser: UserProfile | null
  loading: boolean
  initialized: boolean
  login: (role: UserRole) => Promise<UserProfile | null>
  loginWithPassword: (email: string, password: string) => Promise<UserProfile | null>
  initialize: () => Promise<void>
  setCurrentUser: (user: UserProfile | null) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  loading: false,
  initialized: false,
  login: async (role) => {
    set({ loading: true })
    try {
      const user = await loginAs(role)
      set({ currentUser: user, loading: false })
      return user
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },
  loginWithPassword: async (email, password) => {
    set({ loading: true })
    try {
      const user = await loginWithPassword(email, password)
      set({ currentUser: user, loading: false, initialized: true })
      return user
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },
  initialize: async () => {
    set((state) => ({
      loading: true,
      initialized: true,
      currentUser: state.currentUser,
    }))
    try {
      const user = await restoreSession()
      set((state) => ({
        currentUser: state.currentUser ?? user,
        loading: false,
        initialized: true,
      }))
    } catch {
      set((state) => ({
        currentUser: state.currentUser,
        loading: false,
        initialized: true,
      }))
    }
  },
  setCurrentUser: (user) => set({ currentUser: user, initialized: true, loading: false }),
  logout: async () => {
    await logoutUser()
    set({ currentUser: null })
  },
}))
