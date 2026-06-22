Status: ready-for-agent

# Build CatalogService — replace SetCatalogStore with async Supabase fetching

## Context

`SetCatalogStore` reads `data/sets.json` and per-set card JSON from the app bundle synchronously at init. Replace it with an async service that fetches the `sets` table from Supabase Postgres and card JSON from Supabase Storage.

The bundled `data/` folder and all JSON files in it are removed as part of this issue.

Depends on: issue 03 (Supabase SDK).

## Implementation

Create `PocketBinder/Services/CatalogService.swift`:

```swift
@MainActor
@Observable
final class CatalogService {
    var entries: [SetEntry] = []
    var groupedSets: [(seriesName: String, sets: [SetEntry])] = []
    var isLoading = false
    var error: Error? = nil

    func loadCatalog() async { ... }           // fetch from `sets` table
    func loadCards(setCode: String) async -> [CardEntry]? { ... }  // fetch from Storage `cards/{setCode}.json`
    func slots(for setCode: String) async -> [CatalogSlot]? { ... }
    func totalCollectibles(for setCode: String) -> Int { ... }
}
```

- Cache loaded card JSON in a local `[String: [CardEntry]]` dictionary (in-session, in-memory)
- `loadCatalog()` is called once on app launch after auth is established
- Replace `@Environment(\.catalogStore)` environment key with the new service type

## Definition of Done

- Dashboard shows the same set list as the web app (pulled from Supabase, not the bundle)
- Binder opens and loads cards from Supabase Storage
- Bundled `data/` folder is deleted from the Xcode project
