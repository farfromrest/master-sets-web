Status: completed

# Refactor views — replace SwiftData bindings with service calls

## Context

`DashboardView`, `AddSetSheet`, `SetBinderView`/`BinderViewModel`, and `SettingsView` all use SwiftData's `@Query` and `@Environment(\.modelContext)`. These must be replaced with calls into `UserDataService` and `CatalogService`.

Depends on: issues 05, 06, 07 (CatalogService, UserDataService, AuthView).

## DashboardView

- Remove `@Query private var trackedSets: [TrackedSet]`
- Remove `@Environment(\.modelContext) private var modelContext`
- Read `userDataService.trackedSets` directly (reactive via `@Observable`)
- `TrackedSetRow` reads owned slot count from `userDataService.ownedSlots(for:)` instead of `@Query`
- Swipe-to-delete calls `userDataService.untrackSet(setCode)` instead of `TrackedSet.remove(from:)`

## AddSetSheet

- Remove SwiftData insert
- Call `userDataService.trackSet(setCode)` on selection
- Already-tracked check uses `userDataService.trackedSets.map(\.setCode)`

## BinderViewModel / SetBinderView

- Replace SwiftData `ownedSlots` fetch with `userDataService.ownedSlots(for: setCode)`
- `applyChanges` calls `userDataService.applyChanges(setCode:toAdd:toRemove:)`
- Load catalogue slots via `await catalogService.slots(for: setCode)` on appear

## SettingsView

- Remove any SwiftData export/reset actions
- Add a "Sign out" action that calls `authService.signOut()`

## Definition of Done

- Dashboard shows tracked sets and correct progress without SwiftData
- Binder opens, shows slots, and mark mode apply writes to Supabase
- Adding and removing sets works end-to-end
- Settings sign-out clears the session and returns to AuthView
