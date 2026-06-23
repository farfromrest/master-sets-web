Status: completed

# Build UserDataService — tracked sets + owned slots via Supabase

## Context

Replace SwiftData's `@Query` reactive reads and `modelContext` writes with an `@Observable` service that reads/writes `tracked_sets` and `owned_slots` in Supabase. This is the core data layer replacement.

Depends on: issues 03 and 04 (Supabase SDK + AuthService).

## Implementation

Create `PocketBinder/Services/UserDataService.swift`:

```swift
@MainActor
@Observable
final class UserDataService {
    var trackedSets: [TrackedSet] = []           // plain structs, not @Model
    var ownedSlotIds: [String: Set<String>] = [] // keyed by setCode

    func loadUserData() async { ... }            // fetch tracked_sets + owned_slots on auth

    func trackSet(_ setCode: String) async throws { ... }
    func untrackSet(_ setCode: String) async throws { ... }
    func updatePreferences(setCode: String, prefs: SetPreferences) async throws { ... }

    func applyChanges(setCode: String, toAdd: [String], toRemove: [String]) async throws { ... }
    func ownedSlots(for setCode: String) -> Set<String> { ... }
}
```

- Convert `TrackedSet` and `OwnedSlot` from `@Model` classes to plain structs
- `loadUserData()` called once after `AuthService` establishes a session
- `applyChanges` maps to the same batch upsert/delete pattern already in the web app's `slots.ts`

## Definition of Done

- Dashboard lists the user's tracked sets fetched from Supabase
- Tracking a new set inserts a row in Supabase `tracked_sets`
- Removing a set deletes from both `tracked_sets` and `owned_slots` in Supabase
- Applying mark mode changes upserts/deletes in `owned_slots`
