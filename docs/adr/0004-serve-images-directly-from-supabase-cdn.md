# Serve images directly from Supabase CDN, bypassing Vercel image optimization

All card images and set logos are served directly from Supabase Storage's CDN using `unoptimized` on every Next.js `<Image>` component that renders a Supabase URL. The `/_next/image` Vercel proxy is not used for any catalogue assets.

The upload script always writes the Supabase Storage URL (`/storage/v1/object/public/logos/{setCode}.png`) into `sets.logo_url`, replacing whatever external URL the source data contained.

**Why**: card images are already pre-optimized — 400 px wide, WebP at quality 82 (see ADR 0003). Vercel's image optimization would add a second network hop (Vercel fetches from Supabase, client fetches from Vercel) and charge egress on both ends for a format conversion that has already been done. The net benefit was near zero.

**Why not drop `<Image>` entirely**: `<Image fill>` handles the CSS layout (`object-fit`, intrinsic size reservation) cleanly. `unoptimized` opts out of the proxy while keeping the layout behavior.

**Trade-off accepted**: responsive resizing (serving a 180 px variant vs. the full 400 px file) is foregone. At 400 px WebP the file sizes are small enough (~40–60 KB) that the bandwidth difference is not worth the added complexity or cost.
