# Hotlink card images from external CDNs

Card images are served directly from `images.pokemontcg.io` and `images.scrydex.com` via `next/image` rather than being downloaded and hosted in Supabase Storage. This avoids ingestion pipeline complexity and storage costs, at the cost of a runtime dependency on third-party CDNs we don't control.

The images are Pokémon IP regardless of where they're hosted, so self-hosting wouldn't meaningfully reduce legal exposure — it would only add operational burden. If either CDN becomes unavailable or blocks hotlinking, the fallback is to add an image-fetch step to the existing Python catalogue scripts and store images in Supabase Storage alongside the card JSON.
