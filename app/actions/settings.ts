'use server'

import { createClient } from '@/utils/supabase/server'

export async function updateDefaultLayout(columnCount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('profiles')
    .update({ default_layout: String(columnCount) })
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
