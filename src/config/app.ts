export const MAX_ROLLS = 40
export const EDIT_WINDOW_MINUTES = 90
export const DRAFT_REMINDER_MINUTES = 2
export const LOCK_REMINDER_MINUTES = 5
export const GLOBAL_ASSEMBLY_TIME = '08:00'
export const PUSH_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const APP_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone
