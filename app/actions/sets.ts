'use server'

import { createClient } from '@/utils/supabase/server'

export async function updateTrackedSetPreferences(
  setCode: string,
  prefs: { focus?: string; columnCount?: number; isList?: boolean }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const updates: Record<string, unknown> = {}
  if (prefs.focus !== undefined) updates.focus = prefs.focus
  if (prefs.columnCount !== undefined) updates.column_count = prefs.columnCount
  if (prefs.isList !== undefined) updates.is_list = prefs.isList

  await supabase
    .from('tracked_sets')
    .update(updates)
    .eq('user_id', user.id)
    .eq('set_code', setCode)
    .throwOnError()
}

export async function trackSet(setCode: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_layout')
    .eq('user_id', user.id)
    .single()

  const raw = profile?.default_layout ?? '3'
  const [colStr, mode] = raw.split('-')
  const columnCount = parseInt(colStr) || 3
  const isList = mode === 'list'

  const { error } = await supabase
    .from('tracked_sets')
    .insert({ user_id: user.id, set_code: setCode, column_count: columnCount, is_list: isList })

  if (error && error.code !== '23505') {
    throw new Error(error.message)
  }
}

export async function untrackSet(setCode: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('owned_slots').delete().eq('user_id', user.id).eq('set_code', setCode).throwOnError()
  await supabase.from('tracked_sets').delete().eq('user_id', user.id).eq('set_code', setCode).throwOnError()
}
