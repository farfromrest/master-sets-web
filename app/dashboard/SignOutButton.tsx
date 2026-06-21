'use client'

import { signOut } from '@/app/actions/auth'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-xs text-text-secondary hover:text-text-primary transition-colors"
    >
      Sign out
    </button>
  )
}
