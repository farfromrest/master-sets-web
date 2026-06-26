import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import SignInButton from './SignInButton'

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <main className="flex flex-col">
      <Hero isLoggedIn={isLoggedIn} />
      <About />
      <FeatureRow
        title="Built around your binder"
        description="The binder layout mirrors your physical binder, slot for slot. Before you place a card, you can confirm exactly where it goes — so you never have to pull half the binder apart to fix a position mistake."
        mockup={<BinderMockup />}
        flipped={false}
      />
      <FeatureRow
        title="See exactly where you stand"
        description="Every set you're tracking shows its progress at a glance — slots collected, slots left, how close you are. After a marking session, seeing the numbers move is the whole point."
        mockup={<ProgressMockup />}
        flipped={true}
      />
      <FeatureRow
        title="Mark cards as you go"
        description="Mark Mode lets you tear through a set quickly — one tap per card, no confirmations in the way. Stage as many changes as you want, then apply them all at once when you're done."
        mockup={<MarkModeMockup />}
        flipped={false}
      />
      <ClosingCTA isLoggedIn={isLoggedIn} />
    </main>
  )
}

function CTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return (
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 px-6 py-3 text-brand-cyan text-sm font-medium hover:bg-brand-cyan/20 transition-colors"
      >
        Go to Dashboard <span aria-hidden>→</span>
      </Link>
    )
  }
  return <SignInButton />
}

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="flex flex-col items-center justify-center min-h-svh px-6 py-24 text-center gap-10">
      <div className="space-y-5 max-w-lg">
        <div className="flex items-center justify-center gap-3">
          <Image
            src="/icon.png"
            alt=""
            width={48}
            height={48}
            className="flex-shrink-0"
          />
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-brand-magenta via-brand-violet via-brand-blue to-brand-cyan bg-clip-text text-transparent">
            Master Setting
          </h1>
        </div>
        <p className="text-text-secondary text-lg">
          Track your Pokémon TCG master set collections.
        </p>
        <div className="pt-2 flex flex-col items-center gap-6">
          <CTA isLoggedIn={isLoggedIn} />
          <AppStoreBadge />
        </div>
      </div>
      <a
        href="#about"
        className="animate-bounce-subtle text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Learn more"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  )
}

function About() {
  return (
    <section
      id="about"
      className="px-6 py-20 max-w-2xl mx-auto text-center space-y-1"
    >
      <p className="text-2xl md:text-3xl font-bold leading-tight">
        Some collectors chase rare cards.
      </p>
      <p className="text-2xl md:text-3xl font-bold leading-tight">
        Some of us are out here{' '}
        <span className="bg-gradient-to-r from-brand-magenta via-brand-violet via-brand-blue to-brand-cyan bg-clip-text text-transparent">
          Master Setting.
        </span>
      </p>
    </section>
  )
}

function FeatureRow({
  title,
  description,
  mockup,
  flipped,
}: {
  title: string
  description: string
  mockup: ReactNode
  flipped: boolean
}) {
  return (
    <section className="px-6 py-12 w-full max-w-4xl mx-auto">
      <div
        className={`flex flex-col ${flipped ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10`}
      >
        <div className="flex-1 space-y-3 text-center md:text-left max-w-sm mx-auto md:mx-0">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-text-secondary leading-relaxed">{description}</p>
        </div>
        <div className="flex-1 flex justify-center">{mockup}</div>
      </div>
    </section>
  )
}

function ClosingCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="flex flex-col items-center px-6 py-24 text-center gap-5">
      <p className="text-text-secondary text-sm">
        {isLoggedIn
          ? 'Pick up where you left off.'
          : 'Sign in to start tracking your master sets.'}
      </p>
      <CTA isLoggedIn={isLoggedIn} />
    </section>
  )
}

function AppStoreBadge() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        aria-label="Download on the App Store — coming soon"
        className="inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-black text-sm font-semibold opacity-45 cursor-default select-none"
      >
        <AppleLogo />
        Download on the App Store
      </div>
      <span className="text-text-secondary text-xs">Coming soon</span>
    </div>
  )
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-5 h-5 flex-shrink-0">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

// ── Mockups ────────────────────────────────────────────────────────────────

const BINDER_SLOTS: Array<{
  owned: boolean
  from: [number, number, number]
  to: [number, number, number]
}> = [
  { owned: true, from: [187, 65, 57], to: [223, 55, 56] },
  { owned: false, from: [0, 0, 0], to: [0, 0, 0] },
  { owned: true, from: [245, 41, 52], to: [270, 43, 56] },
  { owned: true, from: [270, 43, 56], to: [317, 47, 59] },
  { owned: false, from: [0, 0, 0], to: [0, 0, 0] },
  { owned: true, from: [187, 65, 57], to: [317, 47, 59] },
  { owned: false, from: [0, 0, 0], to: [0, 0, 0] },
  { owned: true, from: [223, 55, 56], to: [245, 41, 52] },
  { owned: false, from: [0, 0, 0], to: [0, 0, 0] },
]

function BinderMockup() {
  return (
    <div className="bg-binder-surface rounded-xl p-4 shadow-lg">
      <div className="grid grid-cols-3 gap-2 w-48">
        {BINDER_SLOTS.map((slot, i) => (
          <div
            key={i}
            className={`relative aspect-[5/7] rounded-md overflow-hidden border ${
              slot.owned
                ? 'border-white/10'
                : 'border-dashed border-white/[.06]'
            }`}
          >
            {slot.owned ? (
              <>
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    background: `linear-gradient(135deg, hsl(${slot.from[0]},${slot.from[1]}%,${slot.from[2]}%), hsl(${slot.to[0]},${slot.to[1]}%,${slot.to[2]}%))`,
                  }}
                />
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/30 border border-brand-cyan/60 flex items-center justify-center">
                  <CheckIcon />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-holo-cyan/5 via-holo-violet/5 to-holo-magenta/5" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const PROGRESS_SETS = [
  { name: 'Surging Sparks', owned: 312, total: 417, colorFrom: 'hsl(187,88%,59%)', colorTo: 'hsl(223,76%,59%)' },
  { name: 'Prismatic Evolutions', owned: 178, total: 447, colorFrom: 'hsl(270,67%,64%)', colorTo: 'hsl(317,73%,63%)' },
  { name: 'Black Bolt', owned: 51, total: 404, colorFrom: 'hsl(223,76%,59%)', colorTo: 'hsl(270,67%,64%)' },
]

function ProgressMockup() {
  return (
    <div className="bg-binder-surface rounded-xl p-5 w-72 space-y-4 shadow-lg">
      {PROGRESS_SETS.map((set) => {
        const pct = Math.round((set.owned / set.total) * 100)
        return (
          <div key={set.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{set.name}</span>
              <span className="text-text-secondary tabular-nums text-xs">
                {set.owned} / {set.total}
              </span>
            </div>
            <div className="h-1.5 bg-binder-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(to right, ${set.colorFrom}, ${set.colorTo})`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const MARK_SLOTS = [true, true, false, true, false, false, true, false, true]

function MarkModeMockup() {
  const changeCount = 3
  return (
    <div className="bg-binder-surface rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand-cyan" />
          <span className="text-brand-cyan text-xs font-medium">Marking</span>
        </div>
        <span className="text-text-secondary text-xs">{changeCount} changes</span>
      </div>
      <div className="grid grid-cols-3 gap-2 w-48">
        {MARK_SLOTS.map((owned, i) => (
          <div
            key={i}
            className={`relative aspect-[5/7] rounded-md overflow-hidden border ${
              owned ? 'border-white/10' : 'border-dashed border-white/[.06]'
            }`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                owned
                  ? 'from-holo-cyan/20 via-holo-violet/20 to-holo-magenta/20'
                  : 'from-holo-cyan/5 via-holo-violet/5 to-holo-magenta/5'
              }`}
            />
            <div
              className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border flex items-center justify-center ${
                owned
                  ? 'bg-brand-cyan/20 border-brand-cyan/60'
                  : 'bg-transparent border-white/20'
              }`}
            >
              {owned && <CheckIcon />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg
      width="8"
      height="6"
      viewBox="0 0 8 6"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 3l2 2 4-4"
        stroke="hsl(187,88%,59%)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
