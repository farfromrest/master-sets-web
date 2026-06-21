'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toggleSlotOwned } from '@/app/actions/slots'
import type { Slot } from './page'

export function CardDetail({
  slots,
  currentIdx,
  ownedIds,
  setCode,
  setName,
  onClose,
  onNavigate,
  onToggleOwned,
}: {
  slots: Slot[]
  currentIdx: number
  ownedIds: Set<string>
  setCode: string
  setName: string
  onClose: () => void
  onNavigate: (idx: number) => void
  onToggleOwned: (slotId: string, owned: boolean) => void
}) {
  const slot = slots[currentIdx]
  const isOwned = ownedIds.has(slot.slotId)
  const [isPending, startTransition] = useTransition()
  const touchStartX = useRef<number | null>(null)
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null)

  function navigate(dir: 'prev' | 'next') {
    const nextIdx =
      dir === 'prev'
        ? Math.max(0, currentIdx - 1)
        : Math.min(slots.length - 1, currentIdx + 1)
    if (nextIdx === currentIdx) return
    setAnimDir(dir === 'next' ? 'left' : 'right')
    setTimeout(() => setAnimDir(null), 200)
    onNavigate(nextIdx)
  }

  function handleToggle() {
    const next = !isOwned
    onToggleOwned(slot.slotId, next)
    startTransition(async () => {
      try {
        await toggleSlotOwned(setCode, slot.slotId, next)
      } catch {
        onToggleOwned(slot.slotId, !next)
      }
    })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  navigate('prev')
      if (e.key === 'ArrowRight') navigate('next')
      if (e.key === 'Escape')     onClose()
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleToggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 50) navigate(delta < 0 ? 'next' : 'prev')
    touchStartX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-2 text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Close card detail"
      >
        <X size={20} />
      </button>

      {/* Nav arrows */}
      <button
        onClick={() => navigate('prev')}
        disabled={currentIdx === 0}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary disabled:opacity-20 transition-colors px-4 py-6"
        aria-label="Previous card"
      >
        <ChevronLeft size={32} />
      </button>
      <button
        onClick={() => navigate('next')}
        disabled={currentIdx === slots.length - 1}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary disabled:opacity-20 transition-colors px-4 py-6"
        aria-label="Next card"
      >
        <ChevronRight size={32} />
      </button>

      {/* Card + glow */}
      <div
        className={`relative flex flex-col items-center gap-6 transition-all duration-200 ${
          animDir === 'left' ? 'opacity-0 -translate-x-2' : animDir === 'right' ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
        }`}
      >
        <div className="relative">
          <div className="absolute inset-0 scale-110 blur-2xl bg-[radial-gradient(ellipse_at_center,_hsl(270_67%_64%_/_0.35)_0%,_hsl(187_88%_59%_/_0.2)_50%,_transparent_70%)]" />
          <div className="relative w-64 aspect-[5/7] rounded-xl overflow-hidden shadow-2xl">
            {slot.imageUrl ? (
              <Image
                src={slot.imageUrl}
                alt={slot.cardName}
                fill
                sizes="256px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-holo-cyan/30 via-holo-violet/30 to-holo-magenta/30" />
            )}
          </div>
        </div>

        {/* Card info */}
        <div className="text-center space-y-1">
          <p className="text-text-primary font-semibold text-lg leading-tight">{slot.cardName}</p>
          <p className="text-text-secondary text-sm">
            #{slot.cardNumber}
            {slot.showVariantLabel && (
              <span className="ml-2 capitalize">{slot.variant.replace('_', ' ')}</span>
            )}
            <span className="ml-2">· {setName}</span>
          </p>
        </div>

        {/* Collected toggle */}
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`flex items-center gap-2.5 rounded-lg border px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-50 ${
            isOwned
              ? 'bg-brand-cyan/15 border-brand-cyan/40 text-brand-cyan'
              : 'bg-white/[.04] border-white/[.12] text-text-secondary hover:border-white/20 hover:text-text-primary'
          }`}
          aria-pressed={isOwned}
        >
          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            isOwned ? 'bg-brand-cyan border-brand-cyan' : 'border-white/30'
          }`}>
            {isOwned && (
              <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                <path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          {isOwned ? 'Collected' : 'Not collected'}
        </button>
      </div>

      {/* Position indicator */}
      <p className="absolute bottom-6 text-[10px] text-text-secondary">
        {currentIdx + 1} / {slots.length}
      </p>
    </div>
  )
}
