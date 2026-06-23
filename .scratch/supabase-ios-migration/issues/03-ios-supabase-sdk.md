Status: completed

# Add Supabase Swift SDK via Swift Package Manager

## Context

PocketBinder currently has no network dependencies. This issue adds the Supabase Swift SDK, which all subsequent iOS issues depend on.

## Steps

1. In Xcode: File → Add Package Dependencies
   - URL: `https://github.com/supabase/supabase-swift`
   - Version: latest stable release
   - Add the `Supabase` library to the PocketBinder target

2. Create `PocketBinder/Config/Supabase.swift` — a single file that initialises the shared `SupabaseClient`:

```swift
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "YOUR_SUPABASE_URL")!,
    supabaseKey: "YOUR_SUPABASE_ANON_KEY"
)
```

3. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to a `.xcconfig` or `Info.plist` so credentials are not hardcoded — or document that they are hardcoded as acceptable for a hobby project

## Definition of Done

- Project builds cleanly with the Supabase package added
- `supabase` singleton is importable from any file in the target
