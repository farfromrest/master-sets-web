import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SignOutButton } from './SignOutButton'

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

  const [{ data: trackedSets }, { data: ownedSlots }] = await Promise.all([
    supabase
      .from('tracked_sets')
      .select('id, set_code, sets(set_name, series_name, release_date, total_slots)')
      .eq('user_id', user.id),
    supabase
      .from('owned_slots')
      .select('set_code')
      .eq('user_id', user.id),
  ])

  const ownedBySet: Record<string, number> = {}
  for (const row of ownedSlots ?? []) {
    ownedBySet[row.set_code] = (ownedBySet[row.set_code] ?? 0) + 1
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
        <h1 className="text-sm font-semibold bg-gradient-to-r from-brand-magenta via-brand-violet to-brand-cyan bg-clip-text text-transparent">
          MasterSets
        </h1>
        <div className="flex items-center gap-4">
          <Link
            href="/sets"
            className="text-xs text-brand-cyan border border-brand-cyan/30 rounded-md px-3 py-1.5 hover:bg-brand-cyan/10 transition-colors"
          >
            + Add Set
          </Link>
          <Link
            href="/settings"
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M13.3 9.7c.04-.23.07-.46.07-.7s-.03-.47-.07-.7l1.5-1.17a.37.37 0 0 0 .09-.47l-1.42-2.46a.37.37 0 0 0-.45-.16l-1.77.71a5.2 5.2 0 0 0-1.2-.7L9.8 2.1A.36.36 0 0 0 9.44 1.8H6.56a.36.36 0 0 0-.36.3l-.27 1.88c-.43.18-.83.43-1.2.7l-1.77-.71a.36.36 0 0 0-.45.16L1.09 6.59a.36.36 0 0 0 .09.47l1.5 1.17c-.04.23-.07.47-.07.7s.03.47.07.7L1.18 10.8a.37.37 0 0 0-.09.47l1.42 2.46c.09.16.28.22.45.16l1.77-.71c.37.27.77.52 1.2.7l.27 1.88c.04.19.2.3.36.3h2.88c.17 0 .32-.11.36-.3l.27-1.88c.43-.18.83-.43 1.2-.7l1.77.71c.17.06.36 0 .45-.16l1.42-2.46a.37.37 0 0 0-.09-.47l-1.5-1.17Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {groups.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <p className="text-text-primary font-medium">No sets tracked yet</p>
            <p className="text-text-secondary text-sm">
              <Link href="/sets" className="text-brand-cyan hover:underline">Add a set</Link>{' '}
              to start tracking your collection.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.seriesName}>
                <h2 className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-3">
                  {group.seriesName}
                </h2>
                <div className="space-y-2">
                  {group.sets.map((ts) => {
                    const total   = ts.sets.total_slots
                    const owned   = ts.owned
                    const pct     = total > 0 ? Math.round((owned / total) * 100) : 0
                    const done    = total > 0 && owned === total

                    return (
                      <Link
                        key={ts.id}
                        href={`/binder/${ts.set_code}`}
                        className="flex items-center gap-3 rounded-xl bg-binder-surface border border-white/[.06] px-4 py-3 hover:border-white/[.12] hover:bg-binder-elevated transition-all group"
                      >
                        <div className="relative h-8 w-14 flex-shrink-0">
                          <Image
                            src={logoUrl(ts.set_code)}
                            alt={ts.sets.set_name}
                            fill
                            className="object-contain"
                            sizes="56px"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary truncate">
                              {ts.sets.set_name}
                            </span>
                            {done && (
                              <span className="text-[10px] font-semibold text-brand-cyan border border-brand-cyan/40 rounded px-1.5 py-0.5 flex-shrink-0">
                                COMPLETE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-white/[.08] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-magenta via-brand-violet to-brand-cyan transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-secondary flex-shrink-0 tabular-nums">
                              {owned} / {total}
                            </span>
                            <span className="text-xs text-text-secondary flex-shrink-0 tabular-nums w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
