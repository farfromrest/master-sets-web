import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, X } from 'lucide-react'
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
      aria-label={`${setName} card detail`}
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

      {/* Nav row: [←] [card + info] [→] */}
      <div className="flex items-center w-full max-w-sm">
        <button
          onClick={() => navigate('prev')}
          disabled={currentIdx === 0}
          className="flex-shrink-0 text-text-secondary hover:text-text-primary disabled:opacity-20 transition-colors px-3 py-4"
          aria-label="Previous card"
        >
          <ChevronLeft size={32} />
        </button>

        {/* Card column */}
        <div
          className={`flex-1 min-w-0 flex flex-col items-center gap-6 transition-all duration-200 ${
            animDir === 'left' ? 'opacity-0 -translate-x-2' : animDir === 'right' ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
          }`}
        >
          {/* Card image + glow */}
          <div className="relative w-full">
            <div className="absolute inset-0 scale-110 blur-2xl bg-[radial-gradient(ellipse_at_center,_hsl(270_67%_64%_/_0.35)_0%,_hsl(187_88%_59%_/_0.2)_50%,_transparent_70%)]" />
            <div className="relative aspect-[5/7] rounded-xl overflow-hidden shadow-2xl">
              {slot.imageUrl ? (
                <Image
                  src={slot.imageUrl}
                  alt={slot.cardName}
                  fill
                  sizes="(max-width: 384px) calc(100vw - 76px), 308px"
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-holo-cyan/30 via-holo-violet/30 to-holo-magenta/30" />
              )}
            </div>
          </div>

          {/* Card info */}
          <div className="text-center space-y-1.5">
            <p className="text-text-primary font-bold text-3xl leading-tight">{slot.cardName}</p>
            <p className="text-text-secondary text-sm">
              {[
                `#${slot.cardNumber}`,
                slot.variant !== 'normal' ? `· ${slot.variant.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}` : null,
              ].filter(Boolean).join('  ')}
            </p>
          </div>

          {/* Collected toggle */}
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`flex items-center justify-center gap-2.5 w-full rounded-2xl border px-6 py-4 text-base font-semibold transition-all disabled:opacity-50 ${
              isOwned
                ? 'bg-brand-cyan/15 border-brand-cyan/30 text-brand-cyan'
                : 'bg-white/[.04] border-white/[.12] text-text-secondary hover:border-white/20 hover:text-text-primary'
            }`}
            aria-pressed={isOwned}
            aria-label={isOwned ? 'Collected' : 'Not collected'}
          >
            {isOwned
              ? <CheckCircle2 size={20} className="flex-shrink-0" />
              : <Circle size={20} className="flex-shrink-0" />
            }
            Collected
          </button>
        </div>

        <button
          onClick={() => navigate('next')}
          disabled={currentIdx === slots.length - 1}
          className="flex-shrink-0 text-text-secondary hover:text-text-primary disabled:opacity-20 transition-colors px-3 py-4"
          aria-label="Next card"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Position indicator */}
      <p className="absolute bottom-6 text-[10px] text-text-secondary">
        {currentIdx + 1} / {slots.length}
      </p>
    </div>
  )
}
