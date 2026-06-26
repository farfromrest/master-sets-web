'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function SignInButton() {
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setLoading(false)
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={loading}
      className="flex items-center justify-center gap-3 rounded-lg bg-white px-5 py-3 text-black text-sm font-medium hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    >
      <AppleLogo />
      {loading ? 'Signing in…' : 'Sign in with Apple'}
    </button>
  )
}

function AppleLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 814 1000"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-42.4-168.9-103.8c-73.3-73.8-131.7-195.7-131.7-311.5 0-170.4 111.2-260.5 220.4-260.5 66.7 0 122.2 43.9 163.7 43.9 39.5 0 101.3-46.5 176.5-46.5 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  )
}
