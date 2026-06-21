'use client'

import Image from 'next/image'
import type { Slot } from './page'

type Props = {
  slot: Slot
  isOwned: boolean
  mode: 'browse' | 'mark'
  dimmed: boolean
  changed: boolean
  onClick: (e: React.MouseEvent) => void
}

export function CardCell({ slot, isOwned, mode, dimmed, changed, onClick }: Props) {
  return (
    <button
      onClick={(e) => onClick(e)}
      className={`relative w-full rounded-lg overflow-hidden aspect-[5/7] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/70 ${
        dimmed ? 'opacity-40' : 'opacity-100'
      } ${
        mode === 'browse' ? 'hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-cyan/10' : ''
      } ${
        changed ? 'ring-1 ring-brand-cyan/60' : ''
      }`}
      aria-label={`${slot.cardName}${slot.showVariantLabel ? ` (${slot.variant})` : ''}, ${isOwned ? 'collected' : 'missing'}`}
    >
      <div className="absolute inset-0 bg-binder-elevated">
        {slot.imageUrl ? (
          <Image
            src={slot.imageUrl}
            alt={slot.cardName}
            fill
            sizes="(max-width: 640px) 30vw, 180px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-holo-cyan/20 via-holo-violet/20 to-holo-magenta/20" />
        )}
      </div>

      {/* Browse mode: collected badge — white checkmark on dark circle, matches iOS OwnershipIndicator */}
      {mode === 'browse' && isOwned && (
        <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[rgba(31,31,31,0.92)] border border-white/15 flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5l3.2 3.2L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Mark mode: ownership ring */}
      {mode === 'mark' && (
        <div className={`absolute top-1 right-1 w-6 h-6 rounded-full border flex items-center justify-center ${
          isOwned
            ? 'bg-[rgba(31,31,31,0.92)] border-white/15 shadow-[0_1px_4px_rgba(0,0,0,0.6)]'
            : 'bg-black/40 border-white/40'
        }`}>
          {isOwned && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.2 3.2L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      {/* Variant label */}
      {slot.showVariantLabel && (
        <div className="absolute bottom-0 inset-x-0 px-1 pb-0.5 pt-3 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-between">
          <span className="text-[8px] text-white/60 leading-none capitalize">
            {slot.variant.replace('_', ' ')}
          </span>
        </div>
      )}
    </button>
  )
}

export function EmptyPocket() {
  return (
    <div className="relative w-full aspect-[5/7] rounded-lg border border-dashed border-white/[.06] bg-gradient-to-br from-holo-cyan/5 via-holo-violet/5 to-holo-magenta/5" />
  )
}
