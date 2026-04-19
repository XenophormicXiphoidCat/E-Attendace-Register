import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/app'

export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = hasSupabaseEnv
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
