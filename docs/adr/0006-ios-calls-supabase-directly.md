# iOS app calls Supabase directly — no Next.js API proxy

The iOS app authenticates with the same Supabase project as the web app and reads/writes `tracked_sets`, `owned_slots`, and `profiles` directly via the Supabase Swift SDK. The Next.js app is not involved in iOS data access.

The alternative was adding Next.js API routes that the iOS app calls, making Supabase an implementation detail hidden behind the web app. This was rejected because it adds a network hop, a maintenance surface, and a deployment dependency for iOS data access — all for no benefit when Supabase's RLS already enforces all security rules at the database level.

The web app and iOS app share a Supabase project but are otherwise independent clients. Adding a new catalogue set is visible to both platforms immediately via the shared `sets` table and Storage.
