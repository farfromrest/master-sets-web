Status: ready-for-agent

# Replace magic-link login UI with Sign in with Apple button

## Context

The web app landing page (`app/page.tsx`) currently shows a magic-link email form. This needs to be replaced with a Sign in with Apple button that initiates a Supabase OAuth flow.

Depends on: issue 01 (Supabase Apple provider must be configured first).

## Changes

- `app/page.tsx` — replace the magic-link form with a Sign in with Apple button that calls `supabase.auth.signInWithOAuth({ provider: 'apple' })` with the appropriate `redirectTo`
- `app/actions/auth.ts` — remove any magic-link server action if one exists; `signOut` stays
- Remove any magic-link callback route handler if present

## Notes

- The button should use Apple's required styling guidelines (black background, white Apple logo + text "Sign in with Apple") — Apple enforces this for apps using their auth
- The `redirectTo` should point to `/dashboard` (post-auth redirect)
- Supabase handles the OAuth callback at `/auth/v1/callback` on its side; the web app may need an `/auth/callback` route to exchange the code for a session cookie — check whether the existing middleware handles this or if a new route handler is needed

## Definition of Done

- Clicking "Sign in with Apple" on the landing page opens the Apple auth flow
- After successful auth, user lands on `/dashboard` with a valid session
- Magic-link UI and code are fully removed
