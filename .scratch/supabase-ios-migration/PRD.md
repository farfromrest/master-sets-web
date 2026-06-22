# Supabase iOS Migration

## Goal

Migrate the PocketBinder iOS app off SwiftData + iCloud onto the shared Supabase backend, and update the web app to use Sign in with Apple as the sole auth method. Both apps become independent Supabase clients sharing one project.

## Decisions

- iOS calls Supabase directly — no Next.js API proxy (ADR 0006)
- Sign in with Apple everywhere, magic link deprecated (ADR 0005)
- SwiftData removed entirely from iOS, replaced with @Observable service layer (PocketBinder ADR 0001)
- Catalogue pulled from Supabase Storage on demand, not bundled
- Online-only — no offline write queue
- Clean break — no iCloud data migration

## Work Breakdown

### Web App

- [01] Configure Sign in with Apple in Supabase + Apple Developer
- [02] Replace magic-link login UI with Sign in with Apple button

### iOS App

- [03] Add Supabase Swift SDK via Swift Package Manager
- [04] Build AuthService — Sign in with Apple → Supabase session
- [05] Build CatalogService — replace SetCatalogStore with async Supabase fetching
- [06] Build UserDataService — tracked sets + owned slots via Supabase
- [07] Add auth gate (AuthView shown when no session)
- [08] Refactor DashboardView — replace @Query / modelContext with service calls
- [09] Refactor AddSetSheet — replace SwiftData insert with UserDataService
- [10] Refactor SetBinderView / BinderViewModel — replace SwiftData slot reads/writes
- [11] Refactor SettingsView — add sign out, remove SwiftData-specific actions
- [12] Remove SwiftData entirely — @Model, ModelContainer, CloudKit entitlement
