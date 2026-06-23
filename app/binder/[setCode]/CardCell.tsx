import Image from 'next/image'
import { Sparkles, Tag } from 'lucide-react'
import type { Slot } from './page'

// Holo palette: cyan → blue → indigo → violet → magenta (matching iOS HoloPalette)
const HOLO_HSL = [
  [187, 65, 57],
  [223, 55, 56],
  [245, 41, 52],
  [270, 43, 56],
  [317, 47, 59],
] as const

function interpolateHolo(t: number): [number, number, number] {
  const count = HOLO_HSL.length
  const scaled = t * count
  const lower = Math.floor(scaled) % count
  const upper = (lower + 1) % count
  const frac = scaled - Math.floor(scaled)
  const [ah, as_, al] = HOLO_HSL[lower]
  const [bh, bs, bl] = HOLO_HSL[upper]
  return [ah + (bh - ah) * frac, as_ + (bs - as_) * frac, al + (bl - al) * frac]
}

function holoGradientStyle(cardId: string): React.CSSProperties {
  let h = 0
  for (let i = 0; i < cardId.length; i++) {
    h = ((h << 5) - h + cardId.charCodeAt(i)) | 0
  }
  const offset = (Math.abs(h) % 1000) / 1000
  const stops = [0, 0.25, 0.5, 0.75, 1.0].map(t => {
    const [hue, sat, lit] = interpolateHolo((t + offset) % 1.0)
    return `hsl(${Math.round(hue)},${Math.round(sat)}%,${Math.round(lit)}%)`
  })
  return { background: `linear-gradient(135deg, ${stops.join(', ')})` }
}

type Props = {
  slot: Slot
  isOwned: boolean
  mode: 'browse' | 'mark'
  dimmed: boolean
  changed: boolean
  onClick: (e: React.MouseEvent) => void
}

type GridIconType = 'sparkles' | 'tag'

function variantGridInfo(variant: string): { icon: GridIconType; label: string } | null {
  switch (variant) {
    case 'normal':             return null
    case 'holo':               return { icon: 'sparkles', label: 'Holo' }
    case 'reverse_holo':       return { icon: 'sparkles', label: 'Rev Holo' }
    case 'reverse_holo_ball':  return { icon: 'sparkles', label: 'Rev Ball' }
    case 'reverse_holo_energy':return { icon: 'sparkles', label: 'Rev Energy' }
    case 'reverse_holo_r':     return { icon: 'sparkles', label: 'Rev R' }
    case 'poke_ball':          return { icon: 'sparkles', label: 'Poké Ball' }
    case 'master_ball':        return { icon: 'sparkles', label: 'Master' }
    default:                   return {
      icon: 'tag',
      label: variant.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    }
  }
}

export function CardCell({ slot, isOwned, mode, dimmed, changed, onClick }: Props) {
  const gridInfo = slot.showVariantLabel ? variantGridInfo(slot.variant) : null

  return (
    <div
      className={`flex flex-col items-center gap-[3px] transition-opacity ${dimmed ? 'opacity-40' : 'opacity-100'}`}
    >
      <button
        onClick={(e) => onClick(e)}
        className={`relative w-full rounded-lg overflow-hidden aspect-[5/7] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/70 ${
          mode === 'browse' ? 'hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-cyan/10' : ''
        } ${
          changed ? 'ring-1 ring-brand-cyan/60' : ''
        }`}
        aria-label={`${slot.cardName}${slot.showVariantLabel ? ` (${slot.variant})` : ''}, ${isOwned ? 'collected' : 'missing'}`}
      >
        {/* Holo placeholder — visible while image loads or when no URL */}
        <div className="absolute inset-0" style={holoGradientStyle(slot.cardId)}>
          {/* Sheen overlay matching iOS: cyan/20 → white/8 → clear */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, hsla(187,88%,59%,0.2) 0%, rgba(255,255,255,0.08) 25%, transparent 50%)' }}
          />
          {slot.imageUrl && (
            <Image
              src={slot.imageUrl}
              alt={slot.cardName}
              fill
              sizes="(max-width: 640px) 30vw, 180px"
              className="object-cover"
              loading="lazy"
              unoptimized
            />
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
      </button>

      {gridInfo && (
        <div className="flex items-center gap-[2px]">
          {gridInfo.icon === 'sparkles'
            ? <Sparkles size={6} className="text-text-secondary flex-shrink-0" strokeWidth={2.5} />
            : <Tag size={6} className="text-text-secondary flex-shrink-0" strokeWidth={2.5} />
          }
          <span className="text-[8px] font-medium text-text-secondary leading-none">
            {gridInfo.label}
          </span>
        </div>
      )}
    </div>
  )
}

export function EmptyPocket() {
  return (
    <div className="relative w-full aspect-[5/7] rounded-lg border border-dashed border-white/[.06] bg-gradient-to-br from-holo-cyan/5 via-holo-violet/5 to-holo-magenta/5" />
  )
}
