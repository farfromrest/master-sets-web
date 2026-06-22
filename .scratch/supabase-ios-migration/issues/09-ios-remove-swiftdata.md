Status: ready-for-agent

# Remove SwiftData entirely

## Context

Final cleanup once all views have been migrated off SwiftData (issues 05–08). This issue removes all SwiftData infrastructure from the project.

Depends on: issue 08 (all views refactored).

## Checklist

- Remove `import SwiftData` from all files
- Delete `@Model` annotations from `TrackedSet.swift` and `OwnedSlot.swift` (or delete the files if the structs have been moved into the service layer)
- Remove `ModelContainer` setup from `PocketBinderApp.swift`
- Remove `.modelContainer(sharedModelContainer)` modifier
- Remove `MockDataPreviewProvider.swift` or update previews to use mock service instances
- Remove the SwiftData CloudKit entitlement from `PocketBinder.entitlements` (`com.apple.developer.icloud-container-identifiers`, `com.apple.developer.icloud-services`)
- Verify the project builds cleanly with no SwiftData imports

## Definition of Done

- Project compiles with zero references to SwiftData
- CloudKit entitlements are removed
- No `@Model`, `@Query`, `ModelContext`, or `ModelContainer` anywhere in the codebase
