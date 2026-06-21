'use server'

import { createClient } from '@/utils/supabase/server'

export async function toggleSlotOwned(
  setCode: string,
  slotId: string,
  owned: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (owned) {
    await supabase
      .from('owned_slots')
      .upsert({ user_id: user.id, slot_id: slotId, set_code: setCode }, { onConflict: 'user_id,slot_id' })
      .then()
  } else {
    await supabase
      .from('owned_slots')
      .delete()
      .eq('user_id', user.id)
      .eq('slot_id', slotId)
      .then()
  }
}

export async function applyChanges(
  setCode: string,
  toAdd: string[],
  toRemove: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ops: PromiseLike<unknown>[] = []

  if (toAdd.length > 0) {
    ops.push(
      supabase.from('owned_slots').upsert(
        toAdd.map((slotId) => ({ user_id: user.id, slot_id: slotId, set_code: setCode })),
        { onConflict: 'user_id,slot_id' }
      ).then()
    )
  }

  if (toRemove.length > 0) {
    ops.push(
      supabase.from('owned_slots')
        .delete()
        .eq('user_id', user.id)
        .eq('set_code', setCode)
        .in('slot_id', toRemove)
        .then()
    )
  }

  await Promise.all(ops)
}
