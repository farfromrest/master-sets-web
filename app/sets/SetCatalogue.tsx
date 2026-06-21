'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { trackSet } from '@/app/actions/sets'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function logoUrl(setCode: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/logos/${setCode}.png`
}

type CatalogueSet = {
  set_code: string
  set_name: string
  series_name: string
  release_date: string
  total_slots: number
}

type SeriesGroup = {
  seriesName: string
  latestRelease: string
  sets: CatalogueSet[]
}

function groupBySeriesDesc(sets: CatalogueSet[]): SeriesGroup[] {
  const map = new Map<string, SeriesGroup>()
  for (const s of sets) {
    if (!map.has(s.series_name)) {
      map.set(s.series_name, { seriesName: s.series_name, latestRelease: s.release_date, sets: [] })
    }
    const g = map.get(s.series_name)!
    g.sets.push(s)
    if (s.release_date > g.latestRelease) g.latestRelease = s.release_date
  }
  return [...map.values()]
    .sort((a, b) => b.latestRelease.localeCompare(a.latestRelease))
    .map((g) => ({
      ...g,
      sets: [...g.sets].sort((a, b) => b.release_date.localeCompare(a.release_date)),
    }))
}

export function SetCatalogue({
  sets,
  initialTracked,
}: {
  sets: CatalogueSet[]
  initialTracked: Set<string>
}) {
  const [tracked, setTracked] = useState(initialTracked)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  function handleTrack(setCode: string) {
    if (tracked.has(setCode) || pending.has(setCode)) return

    setPending((p) => new Set(p).add(setCode))
    setTracked((t) => new Set(t).add(setCode))

    startTransition(async () => {
      try {
        await trackSet(setCode)
      } catch {
        setTracked((t) => {
          const next = new Set(t)
          next.delete(setCode)
          return next
        })
      } finally {
        setPending((p) => {
          const next = new Set(p)
          next.delete(setCode)
          return next
        })
      }
    })
  }

  const groups = groupBySeriesDesc(sets)

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.seriesName}>
          <h2 className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-3">
            {group.seriesName}
          </h2>
          <div className="space-y-2">
            {group.sets.map((s) => {
              const isTracked = tracked.has(s.set_code)
              const isPending = pending.has(s.set_code)

              return (
                <div
                  key={s.set_code}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                    isTracked
                      ? 'bg-binder-surface/50 border-white/[.04] opacity-50 cursor-default'
                      : 'bg-binder-surface border-white/[.06] hover:border-white/[.12] hover:bg-binder-elevated cursor-pointer'
                  }`}
                  onClick={() => handleTrack(s.set_code)}
                >
                  <div className="relative h-8 w-14 flex-shrink-0">
                    <Image
                      src={logoUrl(s.set_code)}
                      alt={s.set_name}
                      fill
                      className="object-contain"
                      sizes="56px"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{s.set_name}</p>
                    <p className="text-xs text-text-secondary">{s.total_slots} slots</p>
                  </div>

                  <div className="flex-shrink-0 w-20 text-right">
                    {isTracked ? (
                      <span className="text-xs text-text-secondary">Tracking</span>
                    ) : (
                      <span
                        className={`text-xs font-medium text-brand-cyan ${
                          isPending ? 'opacity-50' : ''
                        }`}
                      >
                        {isPending ? 'Adding…' : 'Track'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
