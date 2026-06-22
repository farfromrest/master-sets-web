# Sign in with Apple replaces magic link

Magic link auth is deprecated in favour of Sign in with Apple as the sole authentication method across both the web app and the iOS app.

The web app's existing magic-link accounts are not migrated — users re-authenticate via Apple. This is a one-time breaking change acceptable given the small user base.

The primary reason is cross-platform account identity. Magic link produces a web-only session (cookie-based). Sign in with Apple produces a Supabase OAuth session reachable from both Next.js (web) and the Supabase Swift SDK (iOS), keyed on the same Apple sub identifier. There is no ambiguity about whether a web user and an iOS user are the same person.

The alternative — keeping magic link on web and using Apple auth on iOS, with Supabase account linking — was rejected because Apple's email relay feature makes email-matching unreliable, and the linking logic adds complexity that isn't justified at this project's scale.
