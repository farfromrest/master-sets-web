# Master Setting — Product Requirements Document

## Background

Master Setting is a minimalist tracker for Pokémon TCG Master Set collectors, designed to mimic the physical workflow of a real-world card binder. The app exists as a native iOS app (SwiftUI, Supabase) and a web app, both focused exclusively on master sets.

The iOS app was initially submitted as "Master Sets" but rejected under Guideline 4.3 (Spam). The resubmission as "Master Setting" differentiates on focus — master-set-only, no bulk collection tracking — and Pokémon IP is an accepted ongoing grey area. A web app sidesteps App Store gatekeeping entirely.

This is a hobby project. If asked to take it down for IP reasons, it goes down. The goal is to build the best possible experience for tracking master set collections, not to build a business.

## Goals

1. Replicate the core collect-and-track loop from the iOS app as a responsive web app.
2. Enable cross-device sync via user accounts (Sign in with Apple, shared with iOS app) — no iCloud dependency.
3. Allow set catalogue updates without deploying a new version of the app.
4. Preserve the dark premium binder aesthetic and the physical-binder page metaphor.
5. Take advantage of web-specific affordances (wider viewports, hover, keyboard shortcuts, shift-click range selection).

## Non-Goals

- Offline/PWA support (future consideration, not MVP).
- Social features (friends, trading, leaderboards).
- Monetization.
- Replacing the iOS app — both platforms are maintained.
- Hosting card images (hotlink existing CDNs).

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Single app — API routes + React frontend |
| Language | TypeScript | Full-stack, shared types |
| Styling | Tailwind CSS | Design tokens ported from iOS (`BinderTheme`, `HoloPalette`) |
| Auth | Supabase Auth (Sign in with Apple) | Apple OAuth only |
| Database | Supabase Postgres | User state + set index |
| File Storage | Supabase Storage | Per-set card JSON, set logos |
| Card Images | Hotlink via `next/image` | `images.pokemontcg.io`, `images.scrydex.com` |
| Hosting | Vercel | Deploys from the repo, preview deploys on PRs |
| Repo Structure | Single Next.js app (monorepo not needed) | No separate backend service |

## Data Architecture

### Catalogue Data (read-only, managed by admin scripts)

**Set index — Postgres table (`sets`):**

| Column | Type | Notes |
|---|---|---|
| `set_code` | `text` PK | e.g., `"base1"` |
| `set_name` | `text` | e.g., `"Base Set"` |
| `series_name` | `text` | e.g., `"Base"` |
| `release_date` | `date` | |
| `logo_url` | `text` | Points to Supabase Storage |
| `card_count` | `int` | Number of base cards |
| `total_collectibles` | `int` | Total slots including variants |

Row-level security: public read, no client writes. Updates via admin scripts only.

**Per-set card data — Supabase Storage (JSON files):**

Stored at `cards/{setCode}.json`. Same format as the iOS app's `data/sets/{setCode}.json`. Loaded lazily by the client when a binder is opened.

Each card file contains an array of cards with: `id`, `cardNumber`, `cardName`, `imageUrl` (nullable), and `variants` array. Each variant expands into a catalogue slot with composite ID `"{cardId}_{variant}"`.

**Set logos — Supabase Storage:**

Stored at `logos/{setCode}.png`. Optimized 200px-wide PNGs, same as the iOS app's bundled logos.

### User Data (Postgres, protected by row-level security)

**Tracked sets (`tracked_sets`):**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | References `auth.users` |
| `set_code` | `text` | |
| `date_added` | `timestamptz` | |
| `column_count` | `int` | Default 3 |
| `is_list` | `boolean` | Default false |
| `focus` | `text` | `"all"`, `"missing"`, `"collected"` |
| | | Unique constraint on `(user_id, set_code)` |

**Owned slots (`owned_slots`):**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | References `auth.users` |
| `slot_id` | `text` | Composite key, e.g., `"base1-1_normal"` |
| `set_code` | `text` | For efficient per-set queries |
| `date_owned` | `timestamptz` | |
| | | Unique constraint on `(user_id, slot_id)` |

**User profiles (`profiles`):**

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK FK | References `auth.users` |
| `username` | `text` | Optional, unique, for vanity URLs (fast-follow) |
| `display_name` | `text` | Optional |
| `default_layout` | `text` | Serialized layout preference |

Row-level security: users can read/write only their own rows. Profiles readable by anyone (for shareable links, fast-follow).

### Set Catalogue Update Pipeline

All scripts live in `scripts/`. Adding a new set:

```bash
# 1. Ingest tab-separated card data → writes data/sets/{setCode}.json and updates data/sets.json
python3 scripts/ingest_set.py data.tsv \
  --set-code abc \
  --set-name "Set Name" \
  --series "Series Name" \
  --release 2026/01/01

# 2. Find and download the set logo (probes pokemontcg.io and scrydex.com automatically)
python3 scripts/fetch_logos.py --discover

# 3. Populate card imageUrls from the pokemontcg.io API
python3 scripts/fetch_sets.py --fetch-images

# 4. Upload card JSON, logo, and set metadata to Supabase — live immediately, no deploy needed
python3 scripts/upload_catalogue.py --sets abc
```

**Script reference:**

| Script | Purpose |
|---|---|
| `ingest_set.py` | Converts tab-separated promo set data into `data/sets/{setCode}.json` and updates `data/sets.json`. Codifies variant rules: Jumbo→excluded, Staff→`staff`, Pokémon Center Stamp→`pokemon_center`, else→`normal`. Skips unnumbered cards. |
| `fetch_logos.py` | Downloads and resizes (200px wide) set logos. `--discover` probes pokemontcg.io and scrydex.com for sets with no `logoUrl`. `--force` re-downloads all. |
| `fetch_sets.py` | Enriches card data with `imageUrl` values from the pokemontcg.io API. Caches API responses in `scripts/cache/`. |
| `validate_images.py` | HEAD-checks all non-null `imageUrl` values and reports broken ones. `--fix` nulls out broken URLs. |
| `upload_catalogue.py` | Uploads card JSON to Supabase Storage, upserts set metadata into Postgres, and uploads logos. `--sets abc` limits to one set. |

**Input format for `ingest_set.py`** — tab-separated, 8 columns:

```
[row_id]  set_name  card_number  pokedex_num  card_name  type  source  [notes...]
```

`row_id` may be empty. Card number `--` rows are skipped.

## URL Structure

| Route | Description | Auth |
|---|---|---|
| `/` | Landing page (redirect to `/dashboard` if logged in) | Public |
| `/dashboard` | User's tracked sets with progress | Required |
| `/binder/{setCode}` | Binder view for a set | Required |
| `/sets` | Browse all sets to track | Required |
| `/settings` | User preferences | Required |
| `/u/{username}/{setCode}` | Public shareable collection (fast-follow) | Public |
| `/u/{username}` | Public profile, all tracked sets (fast-follow) | Public |

## Design System

### Ported from iOS

The web app must match the iOS app's visual identity exactly. Dark mode only.

**Surfaces (from `BinderTheme.swift`):**
- Background: `rgb(15, 18, 26)` — `hsl(222, 27%, 8%)`
- Surface: `rgb(26, 28, 38)` — `hsl(228, 19%, 13%)`
- Elevated Surface: `rgb(36, 38, 51)` — `hsl(231, 17%, 17%)`

**Text:**
- Primary: `#ffffff`
- Secondary: `hsl(0, 0%, 55%)`

**Brand Accents (from `BinderTheme.swift` — HSB values):**
- Cyan: `hsb(187, 75%, 95%)` — used for interactive elements, glow, mark mode
- Blue: `hsb(223, 70%, 90%)`
- Violet: `hsb(270, 55%, 88%)`
- Magenta: `hsb(317, 60%, 90%)`

**Holographic Palette (from `HoloPalette.swift` — for card placeholders, shimmer effects):**
- Cyan: `hsb(187, 65%, 85%)`
- Blue: `hsb(223, 60%, 80%)`
- Indigo: `hsb(245, 55%, 72%)`
- Violet: `hsb(270, 50%, 75%)`
- Magenta: `hsb(317, 50%, 78%)`

**Gradients:**
- Brand gradient: magenta -> violet -> blue -> cyan (left to right)
- Angular/radial gradient: cycles through all four brand accents
- Card detail glow: radial violet/cyan gradient behind the card

**Effects:**
- Glow: cyan at 30% opacity
- Subtle glow: violet at 15% opacity
- Dimmed cards (focus mode, search non-matches): 40% opacity (50% under high contrast preference)

### Web-Specific Enhancements

- Hover states on cards (subtle lift/glow)
- Cursor changes (pointer on interactive elements)
- Focus rings for keyboard navigation
- Smooth transitions on card ownership toggle
- Responsive column count based on viewport width

## Features

### MVP

#### 1. Authentication
- Sign in with Apple via Supabase Auth (same provider as iOS app).
- Session persisted across browser tabs/reloads.
- Logged-out users see the landing page only.
- Shared Supabase backend — users see the same data on iOS and web.

#### 2. Dashboard
- Displays all tracked sets grouped by series, sorted by release date (newest first).
- Each set row shows: logo, set name, progress bar, fraction collected (e.g., "142 / 234"), completion percentage.
- Clicking a set navigates to its binder view.
- "Add Set" action to track new sets.
- Sets with 100% completion show a visual badge/indicator.

#### 3. Add Set
- Browse all available sets from the catalogue (Postgres `sets` table).
- Grouped by series, sorted by release date.
- One-click to track. Already-tracked sets shown as disabled.
- Can track multiple sets in one session.

#### 4. Binder View
- **Page metaphor preserved.** Cards arranged in pages (3 or 4 columns x 3 rows = 9 or 12 cards per page). Final page padded with empty pockets. Page dividers between pages with page numbers.
- **Responsive column count.** On narrow viewports (mobile): single binder page visible, 3-4 columns matching iOS. On wider viewports: more columns per page, or multiple pages side-by-side. Column count adapts to viewport, not just 3 or 4.
- **Card cells show:** card image (lazy loaded via `next/image`), card number, variant label (if not normal), collected checkmark badge (in browse mode).
- **Empty pockets:** styled placeholder matching the holographic palette aesthetic. No interaction.

#### 5. Browse Mode (default)
- Click a card to open card detail.
- Collected cards show a checkmark badge (top-right corner).
- "Mark" button in the toolbar enters mark mode.

#### 6. Mark Mode
- Toolbar shows "Marking" indicator with staged change count.
- Click to toggle ownership. Card detail does not open.
- Every card shows an ownership indicator (checkmark or empty ring).
- **Shift-click:** select a range of cards (from last clicked to current). All cards in the range toggle to match the clicked card's new state.
- **Keyboard shortcut** to enter/exit mark mode.
- **Hover preview:** card shows a preview of its would-be state on hover.
- "Done" button saves staged changes as a batch to Supabase. "Cancel" discards.
- Staged changes are computed as a diff (same architecture as iOS: local set of owned IDs, diffed against original snapshot on commit).

#### 7. Mark Mode Menu
- **Mark All Collected** — stages all cards as collected (confirmation dialog).
- **Clear Collected** — stages all cards as missing (confirmation dialog).

#### 8. Focus Mode
- Picker: All Cards / Missing Cards / Collected Cards.
- **Binder mode:** dims unfocused cards (40% opacity; 50% if `prefers-contrast: more`).
- **List mode (fast-follow):** filters cards from the array entirely.
- Toolbar icon changes to indicate active filter.
- Focus preference persisted per set.

#### 9. Find in Binder (Search)
- Search input filters by card name or number.
- Non-matching cards are dimmed.
- Scrolls to the first match.
- Clear search restores full view.

#### 10. Card Detail View
- Horizontal paging — swipe or arrow keys to navigate between cards.
- Full-size card image, unobstructed.
- Radial violet/cyan glow behind the card.
- Card name, number, variant label, set name shown below.
- "Collected" toggle button (checkbox-style, cyan when collected).
- Keyboard: left/right arrows to page, space/enter to toggle collected.

#### 11. Per-Set Layout Preference
- Column count preference stored per tracked set.
- Changeable from the view options menu.

#### 12. View Options Menu (Browse Mode)
- **Focus:** All Cards / Missing Cards / Collected Cards (picker).
- **Layout:** column count options.
- **Share Collection** — generates a plain-text checklist.

#### 13. Text Checklist Export
- Generates a plain-text checklist of the set: card number, name, variant, collected status (checkbox).
- Uses the set name as the title.
- Copies to clipboard or opens the browser share API.

#### 14. Settings
- Default layout preference (column count for new sets).
- Export all data (JSON download of all tracked sets and owned slots).
- Reset data (confirmation dialog, deletes all user data).
- About / contact info.

### Fast-Follow

#### Shareable Public Collection Links
- `/u/{username}/{setCode}` — read-only binder view showing a user's collection for a set.
- `/u/{username}` — public profile showing all tracked sets with progress.
- Open Graph meta tags for rich link previews in Discord/Reddit/Twitter.
- No auth required to view.

#### Optional Username
- Users can set a username in settings.
- Username used for vanity URLs. Falls back to opaque ID if not set.
- Unique constraint enforced.

#### List Mode
- Flowing grid with no pages, dividers, or empty pockets.
- Focus mode filters cards (removes from array) instead of dimming.
- Empty state when filtering results in zero cards.
- Layout toggle in view options menu.

#### Default Layout Preference
- Stored in user profile, applied to newly tracked sets.

### Later

- PWA / offline support with service worker caching and sync.
- Admin UI for set catalogue ingestion.
- Multiple binder pages visible side-by-side on wide viewports.
- Confetti animation on set completion.

## Accessibility

Carry forward the iOS app's accessibility standards:

- All interactive elements have appropriate ARIA roles, labels, and hints.
- Card cells: context-aware hints ("Click to view details" / "Click to toggle collected state" in mark mode).
- Dashboard rows: cohesive accessible label ("{name}, {owned} of {total} collected, {percent} percent").
- Add set rows: disabled state announced for already-tracked sets.
- Keyboard navigation: tab through cards, enter/space to interact, arrow keys in card detail.
- `prefers-reduced-motion`: suppress all animations.
- `prefers-contrast: more`: raise dimmed opacity from 40% to 50%.
- Focus rings visible on all interactive elements.
- Skip-to-content link.

## Performance

- Card images lazy loaded (`next/image` with `loading="lazy"`).
- Card data JSON loaded lazily per set (not preloaded for all tracked sets).
- Set index loaded once at app init, cached.
- Mark mode operates on local state — zero database I/O during tapping. Batch write on commit only.
- Image optimization via `next/image` (WebP/AVIF format negotiation, responsive sizing).

## Security

- Supabase Row-Level Security (RLS) on all user data tables. Users can only read/write their own rows.
- No server-side secrets exposed to the client.
- Auth tokens are short-lived.
- Catalogue data is public-read, admin-write-only.
- No user-generated content beyond username and collection state.
