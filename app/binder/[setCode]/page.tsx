import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BinderView } from './BinderView'

type CardData = {
  id: string
  cardNumber: string
  cardName: string
  imageUrl: string | null
  variants: string[]
}

export type TrackedSetSummary = {
  setCode: string
  setName: string
  logoUrl: string
  owned: number
  total: number
}

type AllTrackedSetRow = {
  set_code: string
  sets: {
    set_name: string
    total_slots: number
  }
}

export type Slot = {
  slotId: string
  cardId: string
  cardNumber: string
  cardName: string
  imageUrl: string | null
  variant: string
  showVariantLabel: boolean
}

function buildSlots(cards: CardData[]): Slot[] {
  return cards.flatMap((card) =>
    card.variants.map((variant) => ({
      slotId: `${card.id}_${variant}`,
      cardId: card.id,
      cardNumber: card.cardNumber,
      cardName: card.cardName,
      imageUrl: card.imageUrl,
      variant,
      showVariantLabel: card.variants.length > 1 && variant !== 'normal',
    }))
  )
}

export default async function BinderPage({
  params,
}: {
  params: Promise<{ setCode: string }>
}) {
  const { setCode } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: trackedSet }, { data: setMeta }, { data: ownedRows }, { data: allTrackedSetRows }, { data: ownedCounts }] = await Promise.all([
    supabase
      .from('tracked_sets')
      .select('column_count, focus, is_list')
      .eq('user_id', user.id)
      .eq('set_code', setCode)
      .single(),
    supabase
      .from('sets')
      .select('set_name')
      .eq('set_code', setCode)
      .single(),
    supabase
      .from('owned_slots')
      .select('slot_id')
      .eq('user_id', user.id)
      .eq('set_code', setCode),
    supabase
      .from('tracked_sets')
      .select('set_code, sets(set_name, total_slots)')
      .eq('user_id', user.id),
    supabase.rpc('get_owned_slot_counts', { p_user_id: user.id }),
  ])

  const ownedBySet: Record<string, number> = {}
  for (const row of ownedCounts ?? []) {
    ownedBySet[row.set_code] = Number(row.owned_count)
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const trackedSets: TrackedSetSummary[] = ((allTrackedSetRows ?? []) as unknown as AllTrackedSetRow[]).map((ts) => ({
    setCode: ts.set_code,
    setName: ts.sets.set_name,
    logoUrl: `${supabaseUrl}/storage/v1/object/public/logos/${ts.set_code}.png`,
    owned: ownedBySet[ts.set_code] ?? 0,
    total: ts.sets.total_slots,
  }))

  if (!trackedSet) redirect('/dashboard')

  const cardJsonUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cards/${setCode}.json`
  const cardRes = await fetch(cardJsonUrl, { next: { revalidate: 3600 } })
  const cards: CardData[] = cardRes.ok ? await cardRes.json() : []

  return (
    <BinderView
      setCode={setCode}
      setName={setMeta?.set_name ?? setCode}
      logoUrl={setMeta ? `${supabaseUrl}/storage/v1/object/public/logos/${setCode}.png` : null}
      trackedSets={trackedSets}
      slots={buildSlots(cards)}
      ownedSlotIds={(ownedRows ?? []).map((r) => r.slot_id)}
      columnCount={trackedSet.column_count}
      initialFocus={trackedSet.focus as 'all' | 'missing' | 'collected'}
      initialIsList={trackedSet.is_list ?? false}
    />
  )
}
