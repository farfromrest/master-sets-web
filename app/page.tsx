'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-brand-magenta via-brand-violet via-brand-blue to-brand-cyan bg-clip-text text-transparent">
            MasterSets
          </h1>
          <p className="text-text-secondary text-sm">
            Track your Pokémon TCG Master Set collections.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-xl bg-binder-surface border border-white/[.06] px-6 py-8 text-center space-y-2">
            <p className="text-text-primary font-medium">Check your email</p>
            <p className="text-text-secondary text-sm">
              We sent a magic link to <span className="text-text-primary">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-lg bg-binder-surface border border-white/[.08] px-4 py-3 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 px-4 py-3 text-brand-cyan text-sm font-medium hover:bg-brand-cyan/20 hover:border-brand-cyan/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
