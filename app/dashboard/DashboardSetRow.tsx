'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { BadgeCheck, Ellipsis } from 'lucide-react'
import { untrackSet } from '@/app/actions/sets'

export function DashboardSetRow({
  setCode,
  setName,
  logoUrl,
  owned,
  total,
}: {
  setCode: string
  setName: string
  logoUrl: string
  owned: number
  total: number
}) {
  const pct = total > 0 ? Math.floor((owned / total) * 100) : 0
  const done = total > 0 && owned === total
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  function handleRemove() {
    setConfirmOpen(false)
    startTransition(async () => {
      await untrackSet(setCode)
      router.refresh()
    })
  }

  return (
    <>
      <div className="relative flex items-center gap-3 rounded-xl bg-binder-surface border border-white/[.06] px-4 py-3 hover:border-white/[.12] hover:bg-binder-elevated transition-all group">
        <Link
          href={`/binder/${setCode}`}
          className="flex items-center gap-3 flex-1 min-w-0"
          aria-label={setName}
        >
          <div className="relative h-8 w-14 flex-shrink-0">
            <Image
              src={logoUrl}
              alt={setName}
              fill
              className="object-contain"
              sizes="56px"
              unoptimized
            />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <span className="block text-sm font-semibold text-text-primary truncate">
              {setName}
            </span>
            <div className="flex items-center">
              <span className="text-xs text-text-secondary tabular-nums">
                {owned} / {total} collected
              </span>
              <div className="flex-1" />
              {done ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-brand-cyan flex-shrink-0">
                  <BadgeCheck size={12} />
                  Complete
                </span>
              ) : (
                <span className="text-xs text-text-secondary tabular-nums flex-shrink-0">
                  {pct}%
                </span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-white/[.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-magenta via-brand-violet to-brand-cyan transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </Link>

        {/* Overflow menu */}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen((o) => !o) }}
            className="p-1 text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            aria-label="Set options"
          >
            <Ellipsis size={16} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-7 z-30 w-40 rounded-xl bg-binder-elevated border border-white/[.08] shadow-xl overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); setConfirmOpen(true) }}
                  className="w-full text-left px-4 py-3 text-xs text-red-400 hover:bg-white/[.04] transition-colors"
                >
                  Remove Set
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs rounded-2xl bg-binder-elevated border border-white/[.08] p-6 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <p className="text-text-primary font-semibold text-sm">Remove {setName}?</p>
              <p className="text-text-secondary text-xs">
                This will remove the set and all ownership data. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={isPending}
                className="flex-1 rounded-lg bg-white/[.04] border border-white/[.08] px-4 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={isPending}
                className="flex-1 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
