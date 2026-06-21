import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const [{ data: trackedSets }, { data: ownedSlots }, { data: setMetas }] = await Promise.all([
    supabase
      .from('tracked_sets')
      .select('set_code, column_count, focus, date_added')
      .eq('user_id', user.id)
      .order('date_added', { ascending: false }),
    supabase
      .from('owned_slots')
      .select('slot_id, set_code, date_owned')
      .eq('user_id', user.id),
    supabase
      .from('sets')
      .select('set_code, set_name'),
  ])

  const setNameMap = Object.fromEntries(
    (setMetas ?? []).map((s) => [s.set_code, s.set_name])
  )

  const exportData = {
    exported_at: new Date().toISOString(),
    tracked_sets: (trackedSets ?? []).map((ts) => ({
      set_code: ts.set_code,
      set_name: setNameMap[ts.set_code] ?? ts.set_code,
      column_count: ts.column_count,
      focus: ts.focus,
      date_added: ts.date_added,
    })),
    owned_slots: ownedSlots ?? [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="mastersets-export.json"',
    },
  })
}
