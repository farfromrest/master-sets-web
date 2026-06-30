'use server'

import { createClient } from '@/utils/supabase/server'

export async function updateDefaultLayout(columnCount: number, isList: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const value = isList ? `${columnCount}-list` : String(columnCount)

  await supabase
    .from('profiles')
    .update({ default_layout: value })
    .eq('user_id', user.id)
    .throwOnError()
}

export async function resetUserData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('owned_slots').delete().eq('user_id', user.id).throwOnError()
  await supabase.from('tracked_sets').delete().eq('user_id', user.id).throwOnError()
}
