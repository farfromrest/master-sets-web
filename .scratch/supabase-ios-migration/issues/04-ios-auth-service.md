Status: ready-for-agent

# Build AuthService — Sign in with Apple → Supabase session

## Context

Replace the implicit iCloud/CloudKit identity with an explicit Supabase session. `AuthService` owns the auth state for the entire app and is injected via the SwiftUI environment.

Depends on: issue 03 (Supabase SDK).

## Implementation

Create `PocketBinder/Services/AuthService.swift`:

```swift
@MainActor
@Observable
final class AuthService {
    var session: Session? = nil
    var isLoading = true

    func restoreSession() async { ... }   // check for existing session on launch
    func signInWithApple() async throws { ... }  // ASAuthorizationAppleIDCredential → supabase.auth.signInWithIdToken
    func signOut() async throws { ... }
}
```

- Use `supabase.auth.signInWithIdToken(credentials:)` with the Apple ID token
- On launch, call `supabase.auth.session` to restore a persisted session
- Observe `supabase.auth.authStateChanges` to react to token refresh and sign-out events

## App wiring

In `PocketBinderApp.swift`:
- Remove `ModelContainer` / `modelContainer` modifier
- Instantiate `AuthService` as `@State` and inject into the environment
- Show `AuthView` when `authService.session == nil`, `DashboardView` when authenticated

## Definition of Done

- Tapping "Sign in with Apple" in `AuthView` completes the Apple auth flow and sets `authService.session`
- Killing and relaunching the app restores the session without re-authenticating
- Signing out clears the session and returns to `AuthView`
