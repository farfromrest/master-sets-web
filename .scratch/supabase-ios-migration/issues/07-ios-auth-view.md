Status: ready-for-agent

# Add auth gate (AuthView shown when no session)

## Context

The app currently launches directly into `DashboardView`. With Supabase auth, the app needs to show a sign-in screen when no session exists and route to the dashboard once authenticated.

Depends on: issue 04 (AuthService).

## Implementation

Create `PocketBinder/Views/Auth/AuthView.swift`:
- "Sign in with Apple" button using `SignInWithAppleButton` from `AuthenticationServices`
- Calls `authService.signInWithApple()` on tap
- Shows a loading state while auth is in progress
- Preserves the dark premium aesthetic (background, brand gradient on the logo/title)

Update `PocketBinderApp.swift`:
- Replace `DashboardView()` root with a conditional:
  - `AuthView()` when `authService.session == nil && !authService.isLoading`
  - A loading spinner while `authService.isLoading`
  - `DashboardView()` when `authService.session != nil`

## Definition of Done

- Cold launch with no session shows `AuthView`
- Cold launch with a valid persisted session goes directly to `DashboardView`
- After sign-in, `AuthView` transitions to `DashboardView`
