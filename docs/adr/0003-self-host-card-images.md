# Self-host card images in Supabase Storage

Supersedes: [0001-hotlink-card-images.md](./0001-hotlink-card-images.md)

Card images are downloaded from their source URLs, resized to a max 400 px wide, converted to WebP (quality 82), and stored in Supabase Storage (`card-images/{setCode}/{cardId}.webp`). The `imageUrl` field in each set's card JSON is rewritten to the Supabase Storage URL before the JSON is uploaded. The app continues to use `imageUrl` as-is with no awareness of where images are hosted.

This is handled by `upload_catalogue.py --images`, run locally by the admin when adding or refreshing sets in the catalogue.

**Why now**: the third-party CDNs (`images.pokemontcg.io`, `images.scrydex.com`) are runtime dependencies the app has no control over. A CDN going down or blocking hotlinks breaks the app for all users. Self-hosting eliminates that dependency.

**Why Supabase Storage**: already used for card JSON and logos; one bucket policy, same SDK, no additional service.

**Why 400 px / WebP**: the largest display surface is ~310 px (Card Detail on a narrow phone). 400 px covers 2× retina. WebP at quality 82 yields ~40–60 KB per image vs. 500 KB–2 MB for the source PNG, keeping the full catalogue (~9 800 images) within the Supabase free tier's 1 GB storage limit.

**Trade-off accepted**: ingesting images takes time and must be re-run when source images change (e.g. errata reprints). This is acceptable because catalogue updates are infrequent and admin-only.
