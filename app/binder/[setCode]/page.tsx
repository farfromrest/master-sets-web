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

  const [{ data: trackedSet }, { data: setMeta }, { data: ownedRows }] = await Promise.all([
    supabase
      .from('tracked_sets')
      .select('column_count, focus, is_list')
      .eq('user_id', user.id)
      .eq('set_code', setCode)
      .single(),
    supabase
      .from('sets')
      .select('set_name, logo_url')
      .eq('set_code', setCode)
      .single(),
    supabase
      .from('owned_slots')
      .select('slot_id')
      .eq('user_id', user.id)
      .eq('set_code', setCode),
  ])

  if (!trackedSet) redirect('/dashboard')

  const cardJsonUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cards/${setCode}.json`
  const cardRes = await fetch(cardJsonUrl, { next: { revalidate: 3600 } })
  const cards: CardData[] = cardRes.ok ? await cardRes.json() : []

  return (
    <BinderView
      setCode={setCode}
      setName={setMeta?.set_name ?? setCode}
      logoUrl={setMeta?.logo_url ?? null}
      slots={buildSlots(cards)}
      ownedSlotIds={(ownedRows ?? []).map((r) => r.slot_id)}
      columnCount={trackedSet.column_count}
      initialFocus={trackedSet.focus as 'all' | 'missing' | 'collected'}
      initialIsList={trackedSet.is_list ?? false}
    />
  )
}
