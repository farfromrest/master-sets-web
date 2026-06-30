'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowLeft } from 'lucide-react'
import { updateDefaultLayout, resetUserData } from '@/app/actions/settings'
import { signOut } from '@/app/actions/auth'

export function SettingsClient({
  defaultColumnCount,
  defaultIsList,
  email,
}: {
  defaultColumnCount: number
  defaultIsList: boolean
  email: string
}) {
  const [cols, setCols] = useState(defaultColumnCount)
  const [isList, setIsList] = useState(defaultIsList)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleIsListChange(val: boolean) {
    setIsList(val)
    startTransition(async () => {
      await updateDefaultLayout(cols, val)
    })
  }

  function handleColsChange(c: number) {
    setCols(c)
    startTransition(async () => {
      await updateDefaultLayout(c, isList)
    })
  }

  function handleReset() {
    startTransition(async () => {
      await resetUserData()
      setResetConfirm(false)
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-binder-bg">
      <header className="sticky top-0 z-10 bg-binder-bg/90 backdrop-blur border-b border-white/[.06] px-4 py-3 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 -m-2 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="flex-1 text-sm font-medium text-text-primary">Settings</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">

        {/* Default Layout */}
        <section className="space-y-3">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Default Layout</p>
          <div className="rounded-xl bg-binder-surface border border-white/[.06] p-4 space-y-4">
            <p className="text-xs text-text-secondary">Applied when you track a new set.</p>
            <div className="space-y-2">
              <p className="text-[10px] text-text-secondary uppercase tracking-widest">View</p>
              <div className="flex gap-2">
                {([false, true] as const).map((listVal) => (
                  <button
                    key={String(listVal)}
                    onClick={() => handleIsListChange(listVal)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isList === listVal
                        ? 'bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan'
                        : 'bg-binder-elevated border border-white/[.06] text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {listVal ? 'List' : 'Binder'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-text-secondary uppercase tracking-widest">Columns</p>
              <div className="flex gap-2">
                {[3, 4].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColsChange(c)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      cols === c
                        ? 'bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan'
                        : 'bg-binder-elevated border border-white/[.06] text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {c === 3 ? '9-pocket' : '12-pocket'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Data */}
        <section className="space-y-3">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Data</p>
          <div className="rounded-xl bg-binder-surface border border-white/[.06] overflow-hidden">
            <a
              href="/api/export"
              className="flex items-center justify-between px-4 py-4 hover:bg-white/[.04] transition-colors"
            >
              <span className="text-sm text-text-primary">Export collection data</span>
              <span className="text-xs text-text-secondary">JSON ↓</span>
            </a>
            <div className="h-px bg-white/[.06]" />
            <button
              onClick={() => setResetConfirm(true)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[.04] transition-colors text-left"
            >
              <span className="text-sm text-red-400">Reset collection data</span>
              <span className="text-xs text-text-secondary">Clears all sets and ownership</span>
            </button>
          </div>
        </section>

        {/* About */}
        <section className="space-y-3">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">About</p>
          <div className="rounded-xl bg-binder-surface border border-white/[.06] overflow-hidden">
            <div className="px-4 py-4 space-y-1">
              <p className="text-sm font-medium text-text-primary">Master Setting</p>
              <p className="text-xs text-text-secondary">A hobby tracker for Pokémon TCG Master Set collectors.</p>
            </div>
            <div className="h-px bg-white/[.06]" />
            <div className="px-4 py-3">
              <p className="text-xs text-text-secondary">
                Card images via{' '}
                <span className="text-text-primary">pokemontcg.io</span>
                {' '}and{' '}
                <span className="text-text-primary">scrydex.com</span>.
              </p>
            </div>
            <div className="h-px bg-white/[.06]" />
            <div className="px-4 py-3">
              <p className="text-xs text-text-secondary">{email}</p>
            </div>
            <div className="h-px bg-white/[.06]" />
            <form action={signOut}>
              <button
                type="submit"
                className="w-full text-left px-4 py-4 text-sm text-red-400 hover:bg-white/[.04] transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </section>

      </main>

      {/* Reset confirmation dialog */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs rounded-2xl bg-binder-elevated border border-white/[.08] p-6 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <p className="text-text-primary font-semibold text-sm">Reset collection data?</p>
              <p className="text-text-secondary text-xs">
                All tracked sets and owned slots will be permanently deleted. Your account stays active.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setResetConfirm(false)}
                disabled={isPending}
                className="flex-1 rounded-lg bg-white/[.04] border border-white/[.08] px-4 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={isPending}
                className="flex-1 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Resetting…' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
