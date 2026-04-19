import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async () => {
  const today = new Date().toISOString().slice(0, 10)
  const { data: classes } = await supabase.from('classes').select('*').eq('active', true)
  const { data: users } = await supabase.from('users').select('*')
  const { data: attendance } = await supabase.from('attendance').select('*').eq('date', today)

  return new Response(
    JSON.stringify({
      ok: true,
      classCount: classes?.length ?? 0,
      userCount: users?.length ?? 0,
      attendanceCount: attendance?.length ?? 0,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  )
})
