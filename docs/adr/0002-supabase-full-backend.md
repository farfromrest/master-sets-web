# Supabase as the full backend

Supabase handles auth (magic link), Postgres (user data + set index), and file storage (card JSON, logos) as a single managed service. This is a hobby project maintained by one person — the operational simplicity of one backend console, one SDK, and co-located RLS policies outweighs the lock-in cost.

The main alternatives considered were a separate auth provider (e.g. Auth.js) with a standalone Postgres instance and S3-compatible storage, but the added complexity of wiring three services together isn't justified at this scale. If the project ever grows beyond a hobby, Supabase's Postgres is standard enough that a migration to a standalone database is feasible; auth and storage would be the harder pieces to extract.
