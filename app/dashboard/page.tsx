import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutGrid, Plus, Settings } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SignOutButton } from './SignOutButton'
import { DashboardSetRow } from './DashboardSetRow'


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function logoUrl(setCode: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/logos/${setCode}.png`
}

type TrackedSetRow = {
  id: string
  set_code: string
  sets: {
    set_name: string
    series_name: string
    release_date: string
    total_slots: number
  }
}

type SeriesGroup = {
  seriesName: string
  latestRelease: string
  sets: (TrackedSetRow & { owned: number })[]
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: trackedSets }, { data: ownedCounts }] = await Promise.all([
    supabase
    .from('tracked_sets')
    .select('id, set_code, sets(set_name, series_name, release_date, total_slots)')
    .eq('user_id', user.id),
    supabase.rpc('get_owned_slot_counts', { p_user_id: user.id }),
  ])

  const ownedBySet: Record<string, number> = {}
  for (const row of ownedCounts ?? []) {
    ownedBySet[row.set_code] = Number(row.owned_count)
  }

  const rows = ((trackedSets ?? []) as unknown as TrackedSetRow[]).map((ts) => ({
    ...ts,
    owned: ownedBySet[ts.set_code] ?? 0,
  }))

  // Group by series, sorted newest-first within each group
  const bySeriesMap = new Map<string, SeriesGroup>()
  for (const row of rows) {
    const name = row.sets.series_name
    if (!bySeriesMap.has(name)) {
      bySeriesMap.set(name, { seriesName: name, latestRelease: row.sets.release_date, sets: [] })
    }
    const group = bySeriesMap.get(name)!
    group.sets.push(row)
    if (row.sets.release_date > group.latestRelease) {
      group.latestRelease = row.sets.release_date
    }
  }

  const groups = [...bySeriesMap.values()]
    .sort((a, b) => b.latestRelease.localeCompare(a.latestRelease))

  for (const g of groups) {
    g.sets.sort((a, b) => b.sets.release_date.localeCompare(a.sets.release_date))
  }

  return (
    <div className="min-h-screen bg-binder-bg">
      <header className="sticky top-0 z-10 bg-binder-bg/90 backdrop-blur border-b border-white/[.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="Master Setting"
            width={40}
            height={40}
            className="flex-shrink-0"
          />
          <h1 className="text-sm font-semibold bg-gradient-to-r from-brand-magenta via-brand-violet to-brand-cyan bg-clip-text text-transparent">
            Master Setting
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sets"
            className="text-xs text-brand-cyan border border-brand-cyan/30 rounded-md px-3 py-1.5 hover:bg-brand-cyan/10 transition-colors"
          >
            + Add Set
          </Link>
          <Link
            href="/settings"
            className="p-2 -m-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Settings"
          >
            <Settings size={18} />
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {groups.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center w-28 h-28">
              <div className="absolute inset-0 rounded-full bg-brand-violet/40 blur-3xl" />
              <div className="absolute inset-0 rounded-full bg-brand-cyan/20 blur-2xl" />
              <LayoutGrid size={56} strokeWidth={0.75} className="relative text-brand-violet" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-text-primary">Start Your Collection</p>
              <p className="text-sm text-text-secondary">
                Track a Pokémon TCG set to start logging your master set binder.
              </p>
            </div>
            <Link
              href="/sets"
              className="inline-flex items-center gap-2 bg-brand-cyan text-binder-bg font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              Add Your First Set
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.seriesName}>
                <h2 className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-3">
                  {group.seriesName}
                </h2>
                <div className="space-y-2">
                  {group.sets.map((ts) => (
                    <DashboardSetRow
                      key={ts.id}
                      setCode={ts.set_code}
                      setName={ts.sets.set_name}
                      logoUrl={logoUrl(ts.set_code)}
                      owned={ts.owned}
                      total={ts.sets.total_slots}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
