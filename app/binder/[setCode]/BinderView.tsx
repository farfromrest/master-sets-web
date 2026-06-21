'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { applyChanges } from '@/app/actions/slots'
import { updateTrackedSetPreferences } from '@/app/actions/sets'
import { CardCell, EmptyPocket } from './CardCell'
import { CardDetail } from './CardDetail'
import { ArrowLeft, ChevronDown, Ellipsis, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Slot, TrackedSetSummary } from './page'

type Filter = 'all' | 'missing' | 'collected'
type Mode = 'browse' | 'mark'

function chunk<T>(arr: T[], size: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < arr.length; i += size) pages.push(arr.slice(i, i + size))
  return pages
}

export function BinderView({
  setCode,
  setName,
  logoUrl,
  trackedSets,
  slots,
  ownedSlotIds,
  columnCount,
  initialFocus,
  initialIsList,
}: {
  setCode: string
  setName: string
  logoUrl: string | null
  trackedSets: TrackedSetSummary[]
  slots: Slot[]
  ownedSlotIds: string[]
  columnCount: number
  initialFocus: Filter
  initialIsList: boolean
}) {
  const [mode, setMode] = useState<Mode>('browse')
  const [ownedIds, setOwnedIds] = useState(() => new Set(ownedSlotIds))
  const [pendingOwned, setPendingOwned] = useState<Set<string> | null>(null)
  const [filter, setFilter] = useState<Filter>(initialFocus)
  const [cols, setCols] = useState(columnCount)
  const [isList, setIsList] = useState(initialIsList)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [openSlotIdx, setOpenSlotIdx] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [checklistCopySuccess, setChecklistCopySuccess] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'mark-all' | 'clear-all' | null>(null)
  const [searchActive, setSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (searchActive) searchInputRef.current?.focus()
  }, [searchActive])

  useEffect(() => {
    if (!searchQuery) return
    const el = document.querySelector('[data-first-match="true"]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [searchQuery])

  function exitSearch() {
    setSearchActive(false)
    setSearchQuery('')
  }

  function matchesSearch(slot: Slot) {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return slot.cardName.toLowerCase().includes(q) || slot.cardNumber.includes(q)
  }

  const lastClickedIdx = useRef<number>(-1)
  const lastClickedState = useRef<boolean>(false)

  function handleFocusChange(f: Filter) {
    setFilter(f)
    setViewMenuOpen(false)
    startTransition(async () => {
      await updateTrackedSetPreferences(setCode, { focus: f })
    })
  }

  function handleColsChange(c: number) {
    setCols(c)
    setViewMenuOpen(false)
    startTransition(async () => {
      await updateTrackedSetPreferences(setCode, { columnCount: c })
    })
  }

  function handleIsListChange(val: boolean) {
    setIsList(val)
    setViewMenuOpen(false)
    startTransition(async () => {
      await updateTrackedSetPreferences(setCode, { isList: val })
    })
  }

  async function shareFullChecklist() {
    const lines: string[] = [
      `${setName} — ${ownedIds.size}/${slots.length} collected`,
      '',
    ]
    for (const s of slots) {
      const label = `#${s.cardNumber} ${s.cardName}${s.showVariantLabel ? ` (${s.variant.replace('_', ' ')})` : ''}`
      lines.push(`${ownedIds.has(s.slotId) ? '✓' : '☐'} ${label}`)
    }
    const text = lines.join('\n')
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: setName, text })
      } else {
        await navigator.clipboard.writeText(text)
        setChecklistCopySuccess(true)
        setTimeout(() => setChecklistCopySuccess(false), 2000)
      }
    } catch {
      // user cancelled or clipboard unavailable
    }
  }

  async function shareCollection() {
    const missingSlots = slots.filter((s) => !ownedIds.has(s.slotId))
    const lines: string[] = [
      missingSlots.length === 0
        ? `${setName} — Complete! (${slots.length}/${slots.length} collected)`
        : `${setName} — ${ownedIds.size}/${slots.length} collected`,
    ]
    if (missingSlots.length > 0) {
      lines.push('', 'Missing:')
      for (const s of missingSlots) {
        lines.push(
          `#${s.cardNumber} ${s.cardName}${s.showVariantLabel ? ` (${s.variant.replace('_', ' ')})` : ''}`
        )
      }
    }
    const text = lines.join('\n')
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: setName, text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      }
    } catch {
      // user cancelled or clipboard unavailable
    }
  }

  const displayOwned = pendingOwned ?? ownedIds
  const slotsPerPage = cols * 3

  const visibleSlots = isList && filter !== 'all' && mode === 'browse'
    ? slots.filter((s) =>
        filter === 'missing'
          ? !displayOwned.has(s.slotId)
          : displayOwned.has(s.slotId)
      )
    : slots

  function enterMarkMode() {
    setPendingOwned(new Set(ownedIds))
    setMode('mark')
    lastClickedIdx.current = -1
  }

  function cancelMarkMode() {
    setPendingOwned(null)
    setMode('browse')
    setApplyError(null)
  }

  function applyMarkMode() {
    if (!pendingOwned) return
    const toAdd = slots
      .filter((s) => pendingOwned.has(s.slotId) && !ownedIds.has(s.slotId))
      .map((s) => s.slotId)
    const toRemove = slots
      .filter((s) => !pendingOwned.has(s.slotId) && ownedIds.has(s.slotId))
      .map((s) => s.slotId)

    if (toAdd.length === 0 && toRemove.length === 0) {
      cancelMarkMode()
      return
    }

    setApplyError(null)
    startTransition(async () => {
      try {
        await applyChanges(setCode, toAdd, toRemove)
        setOwnedIds(new Set(pendingOwned))
        setPendingOwned(null)
        setMode('browse')
      } catch {
        setApplyError('Failed to save changes. Try again.')
      }
    })
  }

  const handleCardClick = useCallback(
    (idx: number, e: React.MouseEvent) => {
      if (mode === 'browse') {
        setOpenSlotIdx(idx)
        return
      }

      setPendingOwned((prev) => {
        if (!prev) return prev
        const next = new Set(prev)
        const slotId = slots[idx].slotId

        if (e.shiftKey && lastClickedIdx.current >= 0) {
          const lo = Math.min(lastClickedIdx.current, idx)
          const hi = Math.max(lastClickedIdx.current, idx)
          for (let i = lo; i <= hi; i++) {
            if (lastClickedState.current) {
              next.add(slots[i].slotId)
            } else {
              next.delete(slots[i].slotId)
            }
          }
        } else {
          const nowOwned = !prev.has(slotId)
          if (nowOwned) {
            next.add(slotId)
          } else {
            next.delete(slotId)
          }
          lastClickedState.current = nowOwned
          lastClickedIdx.current = idx
        }

        return next
      })
    },
    [mode, slots]
  )

  const pendingCount =
    pendingOwned != null
      ? slots.filter(
          (s) =>
            pendingOwned.has(s.slotId) !== ownedIds.has(s.slotId)
        ).length
      : 0

  const pages = chunk(visibleSlots, slotsPerPage)
  const lastPagePadding =
    pages.length > 0
      ? slotsPerPage - pages[pages.length - 1].length
      : 0

  return (
    <div className="min-h-screen bg-binder-bg">
      {/* Toolbar */}
      <header className="sticky top-0 z-10 bg-binder-bg/90 backdrop-blur border-b border-white/[.06] px-4 py-3">
        {mode === 'browse' ? (
          searchActive ? (
            <div className="flex items-center gap-2">
              <button
                onClick={exitSearch}
                className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                aria-label="Exit search"
              >
                <ArrowLeft size={18} />
              </button>
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && exitSearch()}
                placeholder="Card name or number…"
                className="flex-1 bg-binder-surface border border-white/[.08] rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-brand-cyan/40 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0 text-xs"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
              {/* Left: home link */}
              <Link
                href="/dashboard"
                className="p-2 -m-2 justify-self-start"
                aria-label="Back to dashboard"
              >
                <span className="text-sm font-semibold bg-gradient-to-r from-brand-magenta via-brand-violet to-brand-cyan bg-clip-text text-transparent">
                  MasterSets
                </span>
              </Link>

              {/* Center: set switcher */}
              <button
                onClick={() => setSwitcherOpen(true)}
                className="flex items-center gap-1.5"
                aria-label="Switch set"
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={setName} className="max-h-[30px] max-w-[150px] w-auto object-contain" />
                ) : (
                  <span className="text-sm font-medium text-text-primary truncate">{setName}</span>
                )}
                <ChevronDown size={14} className="text-text-secondary flex-shrink-0" />
              </button>

              {/* Right: actions */}
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setSearchActive(true)}
                  className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Search cards"
                >
                  <Search size={16} />
                </button>

                <button
                  onClick={() => setViewMenuOpen(true)}
                  className={`p-2 transition-colors ${viewMenuOpen ? 'text-brand-cyan' : 'text-text-secondary hover:text-text-primary'}`}
                  aria-label="View options"
                >
                  <SlidersHorizontal size={16} />
                </button>

                <button
                  onClick={enterMarkMode}
                  className="text-xs font-medium text-brand-cyan border border-brand-cyan/30 rounded-md px-3 py-1.5 hover:bg-brand-cyan/10 transition-colors"
                >
                  Mark
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={cancelMarkMode}
              disabled={isPending}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <div className="flex-1 text-center">
              <span className="text-xs font-medium text-brand-cyan">
                Marking
                {pendingCount > 0 && (
                  <span className="ml-1.5 bg-brand-cyan/20 rounded-full px-2 py-0.5">
                    {pendingCount}
                  </span>
                )}
              </span>
              {applyError && (
                <p className="text-[10px] text-red-400 mt-0.5">{applyError}</p>
              )}
            </div>

            {/* Mark mode menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                disabled={isPending}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 px-1"
                aria-label="Mark mode options"
              >
                <Ellipsis size={18} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-7 z-30 w-48 rounded-xl bg-binder-elevated border border-white/[.08] shadow-xl overflow-hidden">
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmAction('mark-all') }}
                      className="w-full text-left px-4 py-3 text-xs text-text-primary hover:bg-white/[.04] transition-colors"
                    >
                      Mark All Collected
                    </button>
                    <div className="h-px bg-white/[.06]" />
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmAction('clear-all') }}
                      className="w-full text-left px-4 py-3 text-xs text-red-400 hover:bg-white/[.04] transition-colors"
                    >
                      Clear Collected
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={applyMarkMode}
              disabled={isPending}
              className="text-xs font-medium text-brand-cyan border border-brand-cyan/30 rounded-md px-3 py-1.5 hover:bg-brand-cyan/10 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Apply'}
            </button>
          </div>
        )}
      </header>

      {/* Binder pages / List */}
      <main className="max-w-2xl lg:max-w-none mx-auto px-4 py-6">
        {isList && mode === 'browse' ? (
          visibleSlots.length === 0 ? (
            <div className="flex flex-col items-center gap-3 pt-20 text-center">
              <p className="text-text-primary text-sm font-medium">
                {filter === 'missing' ? 'No missing cards' : 'No collected cards yet'}
              </p>
              <p className="text-text-secondary text-xs">
                {filter === 'missing'
                  ? "You've collected everything in this set!"
                  : 'Start marking cards to see them here.'}
              </p>
            </div>
          ) : (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}
            >
              {visibleSlots.map((slot, idx) => {
                const isOwned = displayOwned.has(slot.slotId)
                const matches = matchesSearch(slot)
                const isDimmed = !matches
                const isFirstMatch =
                  searchQuery !== '' &&
                  matches &&
                  visibleSlots.findIndex((s) => matchesSearch(s)) === idx
                return (
                  <div
                    key={slot.slotId}
                    data-first-match={isFirstMatch ? 'true' : undefined}
                  >
                    <CardCell
                      slot={slot}
                      isOwned={isOwned}
                      mode={mode}
                      dimmed={isDimmed}
                      changed={false}
                      onClick={(e: React.MouseEvent) => handleCardClick(slots.indexOf(slot), e)}
                    />
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <>
            {/* Mobile: single-column pages */}
            <div className="lg:hidden space-y-6">
              {pages.map((page, pageIdx) => {
                const globalStart = pageIdx * slotsPerPage
                const isLastPage = pageIdx === pages.length - 1
                return (
                  <div key={pageIdx}>
                    {pageIdx > 0 && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-white/[.06]" />
                        <span className="text-[10px] text-text-secondary">Page {pageIdx + 1}</span>
                        <div className="flex-1 h-px bg-white/[.06]" />
                      </div>
                    )}
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                      {page.map((slot, slotIdx) => {
                        const globalIdx = globalStart + slotIdx
                        const isOwned = displayOwned.has(slot.slotId)
                        const changed = pendingOwned != null && pendingOwned.has(slot.slotId) !== ownedIds.has(slot.slotId)
                        const matches = matchesSearch(slot)
                        const isDimmed = !matches || (filter === 'missing' && isOwned) || (filter === 'collected' && !isOwned)
                        const isFirstMatch = searchQuery !== '' && matches && slots.findIndex((s) => matchesSearch(s)) === globalIdx
                        return (
                          <div key={slot.slotId} data-first-match={isFirstMatch ? 'true' : undefined}>
                            <CardCell slot={slot} isOwned={isOwned} mode={mode} dimmed={isDimmed} changed={changed} onClick={(e: React.MouseEvent) => handleCardClick(globalIdx, e)} />
                          </div>
                        )
                      })}
                      {isLastPage && Array.from({ length: lastPagePadding }).map((_, i) => <EmptyPocket key={`empty-${i}`} />)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: two-up spreads */}
            <div className="hidden lg:block space-y-10">
              {(() => {
                const spreads: Array<[typeof pages[0], typeof pages[0] | null]> = []
                for (let i = 0; i < pages.length; i += 2) spreads.push([pages[i], pages[i + 1] ?? null])

                const renderPageGrid = (page: typeof pages[0], pageGlobalStart: number, isLastPage: boolean) => (
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {page.map((slot, slotIdx) => {
                      const globalIdx = pageGlobalStart + slotIdx
                      const isOwned = displayOwned.has(slot.slotId)
                      const changed = pendingOwned != null && pendingOwned.has(slot.slotId) !== ownedIds.has(slot.slotId)
                      const matches = matchesSearch(slot)
                      const isDimmed = !matches || (filter === 'missing' && isOwned) || (filter === 'collected' && !isOwned)
                      const isFirstMatch = searchQuery !== '' && matches && slots.findIndex((s) => matchesSearch(s)) === globalIdx
                      return (
                        <div key={slot.slotId} data-first-match={isFirstMatch ? 'true' : undefined}>
                          <CardCell slot={slot} isOwned={isOwned} mode={mode} dimmed={isDimmed} changed={changed} onClick={(e: React.MouseEvent) => handleCardClick(globalIdx, e)} />
                        </div>
                      )
                    })}
                    {isLastPage && Array.from({ length: lastPagePadding }).map((_, i) => <EmptyPocket key={`empty-last-${i}`} />)}
                  </div>
                )

                const renderEmptyGrid = () => (
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {Array.from({ length: slotsPerPage }).map((_, i) => <EmptyPocket key={`empty-right-${i}`} />)}
                  </div>
                )

                return spreads.map(([leftPage, rightPage], spreadIdx) => {
                  const leftPageIdx = spreadIdx * 2
                  const rightPageIdx = spreadIdx * 2 + 1
                  const isLastLeft = leftPageIdx === pages.length - 1
                  const isLastRight = rightPage !== null && rightPageIdx === pages.length - 1

                  return (
                    <div key={spreadIdx} className="flex items-start">
                      <div className="flex-1 min-w-0 space-y-2">
                        {renderPageGrid(leftPage, leftPageIdx * slotsPerPage, isLastLeft)}
                        <p className="text-center text-[10px] text-text-secondary">Page {leftPageIdx + 1} of {pages.length}</p>
                      </div>
                      {/* Spine */}
                      <div className="w-2.5 shrink-0 self-stretch mx-3 rounded-full bg-black/50 border-x border-white/[.04]" />
                      <div className="flex-1 min-w-0 space-y-2">
                        {rightPage ? renderPageGrid(rightPage, rightPageIdx * slotsPerPage, isLastRight) : renderEmptyGrid()}
                        {rightPage && (
                          <p className="text-center text-[10px] text-text-secondary">Page {rightPageIdx + 1} of {pages.length}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </>
        )}
      </main>

      {/* Mark mode menu confirmation */}
      {confirmAction !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs rounded-2xl bg-binder-elevated border border-white/[.08] p-6 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <p className="text-text-primary font-semibold text-sm">
                {confirmAction === 'mark-all' ? 'Mark All Collected?' : 'Clear Collected?'}
              </p>
              <p className="text-text-secondary text-xs">
                {confirmAction === 'mark-all'
                  ? `All ${slots.length} slots will be staged as collected. Apply to save.`
                  : 'All collected slots will be staged as missing. Apply to save.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-lg bg-white/[.04] border border-white/[.08] px-4 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'mark-all') {
                    setPendingOwned(new Set(slots.map((s) => s.slotId)))
                  } else {
                    setPendingOwned(new Set())
                  }
                  setConfirmAction(null)
                }}
                className={`flex-1 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                  confirmAction === 'mark-all'
                    ? 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/20'
                    : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                }`}
              >
                {confirmAction === 'mark-all' ? 'Mark All' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View options bottom sheet */}
      {viewMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setViewMenuOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-binder-elevated rounded-t-2xl border-t border-white/[.08] shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="px-6 pb-8 space-y-6 pt-3">

              {/* Focus */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Focus</p>
                <div className="flex gap-2">
                  {(['all', 'missing', 'collected'] as Filter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => handleFocusChange(f)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors capitalize ${
                        filter === f
                          ? 'bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan'
                          : 'bg-binder-surface border border-white/[.06] text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Layout</p>
                <div className="flex gap-2">
                  {([false, true] as const).map((listVal) => (
                    <button
                      key={String(listVal)}
                      onClick={() => handleIsListChange(listVal)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        isList === listVal
                          ? 'bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan'
                          : 'bg-binder-surface border border-white/[.06] text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {listVal ? 'List' : 'Binder'}
                    </button>
                  ))}
                </div>
                {!isList && (
                  <>
                    <p className="text-[10px] text-text-secondary">Pockets</p>
                    <div className="flex gap-2">
                      {[3, 4].map((c) => (
                        <button
                          key={c}
                          onClick={() => handleColsChange(c)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                            cols === c
                              ? 'bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan'
                              : 'bg-binder-surface border border-white/[.06] text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {c === 3 ? '9-pocket' : '12-pocket'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Share */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Share</p>
                <button
                  onClick={shareCollection}
                  className={`w-full py-3 rounded-xl text-sm font-medium border transition-colors ${
                    copySuccess
                      ? 'bg-brand-cyan/20 border-brand-cyan/40 text-brand-cyan'
                      : 'bg-binder-surface border-white/[.06] text-text-primary hover:border-white/[.12]'
                  }`}
                >
                  {copySuccess ? '✓ Copied to clipboard' : 'Share missing cards'}
                </button>
                <button
                  onClick={shareFullChecklist}
                  className={`w-full py-3 rounded-xl text-sm font-medium border transition-colors ${
                    checklistCopySuccess
                      ? 'bg-brand-cyan/20 border-brand-cyan/40 text-brand-cyan'
                      : 'bg-binder-surface border-white/[.06] text-text-primary hover:border-white/[.12]'
                  }`}
                >
                  {checklistCopySuccess ? '✓ Copied to clipboard' : 'Share full checklist'}
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Set switcher bottom sheet */}
      {switcherOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setSwitcherOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-binder-elevated rounded-t-2xl border-t border-white/[.08] shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="px-4 pb-8 pt-2 max-h-[70vh] overflow-y-auto space-y-1">
              {trackedSets.map((ts) => {
                const isCurrent = ts.setCode === setCode
                const pct = ts.total > 0 ? Math.round((ts.owned / ts.total) * 100) : 0
                return (
                  <Link
                    key={ts.setCode}
                    href={`/binder/${ts.setCode}`}
                    onClick={() => setSwitcherOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                      isCurrent ? 'bg-brand-cyan/10 border border-brand-cyan/20' : 'hover:bg-white/[.04]'
                    }`}
                  >
                    {ts.logoUrl && (
                      <div className="h-7 w-12 flex-shrink-0">
                        <img src={ts.logoUrl} alt={ts.setName} className="h-full w-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <span className={`text-sm font-medium truncate block ${isCurrent ? 'text-brand-cyan' : 'text-text-primary'}`}>
                        {ts.setName}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-white/[.08] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-magenta via-brand-violet to-brand-cyan"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary flex-shrink-0 tabular-nums">{ts.owned}/{ts.total}</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="flex-shrink-0 text-brand-cyan">
                        <path d="M1 5l3.2 3.2L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {openSlotIdx !== null && (
        <CardDetail
          slots={slots}
          currentIdx={openSlotIdx}
          ownedIds={ownedIds}
          setCode={setCode}
          setName={setName}
          onClose={() => setOpenSlotIdx(null)}
          onNavigate={(idx) => setOpenSlotIdx(idx)}
          onToggleOwned={(slotId, owned) => {
            setOwnedIds((prev) => {
              const next = new Set(prev)
              if (owned) next.add(slotId)
              else next.delete(slotId)
              return next
            })
          }}
        />
      )}
    </div>
  )
}
