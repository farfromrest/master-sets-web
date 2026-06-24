#!/usr/bin/env python3
"""
upload_catalogue.py — Upload Master Setting catalogue data to Supabase.

Reads sets.json and per-set card JSON from the local data directory, then:
  • Upserts rows into the `sets` Postgres table
  • Uploads per-set card JSON to Supabase Storage (cards/{setCode}.json)
  • Uploads set logos to Supabase Storage (logos/{setCode}.png)

With --images:
  • Downloads each card image from its source URL
  • Resizes to max 400 px wide and converts to WebP (quality 82)
  • Uploads to Supabase Storage (card-images/{setCode}/{cardId}.webp)
  • Rewrites imageUrl in the card JSON to the Supabase Storage URL
  • Re-uploads the updated card JSON

Requires:
  SUPABASE_URL         — project URL (e.g. https://xxx.supabase.co)
  SUPABASE_SERVICE_KEY — service role key from Dashboard → Settings → API

Usage:
  python3 scripts/upload_catalogue.py
  python3 scripts/upload_catalogue.py --images
  python3 scripts/upload_catalogue.py --data-dir /path/to/data
  python3 scripts/upload_catalogue.py --sets sv1,sv2 --images
  python3 scripts/upload_catalogue.py --dry-run --images
"""

import argparse
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

import ssl
import warnings
warnings.filterwarnings("ignore", message="Unverified HTTPS")

# Corporate/VPN proxy injects a self-signed cert that Python's CA store
# doesn't trust. Patch ssl.create_default_context so every TLS client
# (httpx, urllib) gets an unverified context.
def _unverified_context(*args, **kwargs):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

ssl.create_default_context         = _unverified_context
ssl._create_default_https_context  = _unverified_context

from PIL import Image
from supabase import create_client, Client


# ── Defaults ───────────────────────────────────────────────────────────────────

DEFAULT_DATA_DIR = Path(__file__).parent.parent / "data"
IMAGE_MAX_WIDTH  = 400
IMAGE_QUALITY    = 82


# ── Helpers ────────────────────────────────────────────────────────────────────

def to_snake(entry: dict) -> dict:
    """Convert sets.json camelCase fields to snake_case for Postgres."""
    date_raw = entry.get("releaseDate", "")
    release_date = date_raw.replace("/", "-") if date_raw else None

    return {
        "set_code":    entry["setCode"],
        "set_name":    entry["setName"],
        "series_name": entry["seriesName"],
        "release_date": release_date,
        "card_count":  entry.get("cardCount", 0),
        "total_slots": entry.get("totalCollectibles", 0),
    }


def fetch_bytes(url: str, label: str = "resource") -> bytes | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MasterSets/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()
    except Exception as e:
        print(f"    ✗ {label} download failed: {e}")
        return None


def optimize_card_image(raw: bytes) -> bytes:
    """Resize to max IMAGE_MAX_WIDTH wide and encode as WebP."""
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    if img.width > IMAGE_MAX_WIDTH:
        ratio = IMAGE_MAX_WIDTH / img.width
        img = img.resize((IMAGE_MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=IMAGE_QUALITY)
    return buf.getvalue()


def supabase_logo_url(supabase_url: str, set_code: str) -> str:
    return f"{supabase_url}/storage/v1/object/public/logos/{set_code}.png"


def supabase_image_url(supabase_url: str, set_code: str, card_id: str) -> str:
    return f"{supabase_url}/storage/v1/object/public/card-images/{set_code}/{card_id}.webp"


def process_images(
    cards: list[dict],
    set_code: str,
    supabase: Client,
    supabase_url: str,
    dry_run: bool,
) -> list[dict]:
    """
    Download, optimize, and upload images for all cards in a set.
    Returns a new card list with imageUrl rewritten to Supabase Storage URLs.
    """
    ok = err = skipped = 0
    updated_cards = []

    for card in cards:
        card_id   = card["id"]
        source_url = card.get("imageUrl")
        target_url = supabase_image_url(supabase_url, set_code, card_id)
        storage_path = f"{set_code}/{card_id}.webp"

        if not source_url:
            updated_cards.append(card)
            skipped += 1
            continue

        raw = fetch_bytes(source_url, label=f"image {card_id}")
        if raw is None:
            updated_cards.append(card)
            err += 1
            continue

        webp = optimize_card_image(raw)

        if not dry_run:
            try:
                supabase.storage.from_("card-images").upload(
                    storage_path,
                    webp,
                    {"content-type": "image/webp", "upsert": "true"},
                )
            except Exception as e:
                print(f"    ✗ upload failed for {card_id}: {e}")
                updated_cards.append(card)
                err += 1
                continue

        updated_cards.append({**card, "imageUrl": target_url})
        ok += 1

    kb_saved = ok  # rough placeholder; actual savings vary
    size_note = f"~{ok * IMAGE_MAX_WIDTH * IMAGE_QUALITY // 8 // 1024} KB est." if ok else ""
    print(f"  Images: {ok} uploaded, {skipped} skipped (no URL), {err} errors  {size_note}")
    return updated_cards


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", metavar="PATH", default=str(DEFAULT_DATA_DIR),
                        help="Path to PocketBinder data directory")
    parser.add_argument("--sets", metavar="CODES",
                        help="Comma-separated set codes to process (default: all)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would happen without uploading")
    parser.add_argument("--images", action="store_true",
                        help="Download, optimize, and upload card images to Supabase Storage")
    parser.add_argument("--skip-cards", action="store_true",
                        help="Skip uploading card JSON files")
    parser.add_argument("--skip-logos", action="store_true",
                        help="Skip uploading logos")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("Error: set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.")

    data_dir  = Path(args.data_dir)
    sets_file = data_dir / "sets.json"
    sets_dir  = data_dir / "sets"
    logos_dir = data_dir / "logos"

    if not sets_file.exists():
        sys.exit(f"Error: {sets_file} not found.")

    sets = json.loads(sets_file.read_text(encoding="utf-8"))

    if args.sets:
        codes = {s.strip() for s in args.sets.split(",")}
        sets = [s for s in sets if s.get("setCode") in codes]
        if not sets:
            sys.exit(f"No matching sets for: {args.sets}")

    print(f"{'DRY RUN — ' if args.dry_run else ''}Processing {len(sets)} set(s)\n" + "=" * 60)

    supabase: Client = create_client(url, key)

    db_ok = db_err = card_ok = card_err = logo_ok = logo_err = 0

    for entry in sets:
        code = entry.get("setCode", "?")
        name = entry.get("setName", code)
        print(f"\n[{code}]  {name}")

        # ── Upsert set row ─────────────────────────────────────────────────────
        row = to_snake(entry)
        if args.dry_run:
            print(f"  [dry-run] would upsert: {row}")
        else:
            try:
                supabase.table("sets").upsert(row).execute()
                print(f"  ✓ upserted sets row ({row['card_count']} cards, {row['total_slots']} slots)")
                db_ok += 1
            except Exception as e:
                print(f"  ✗ upsert failed: {e}")
                db_err += 1

        # ── Process card JSON (and optionally images) ──────────────────────────
        if not args.skip_cards:
            card_file = sets_dir / f"{code}.json"
            if not card_file.exists():
                print(f"  ⚠️  card file not found: {card_file}")
                card_err += 1
            else:
                cards = json.loads(card_file.read_text(encoding="utf-8"))

                if args.images:
                    print(f"  Downloading and optimizing {len(cards)} card images…")
                    if args.dry_run:
                        print(f"  [dry-run] would download/optimize/upload images for {len(cards)} cards")
                    else:
                        cards = process_images(cards, code, supabase, url, dry_run=False)

                card_data = json.dumps(cards, ensure_ascii=False).encode("utf-8")

                if args.dry_run:
                    print(f"  [dry-run] would upload cards/{code}.json ({len(card_data)} bytes)")
                else:
                    try:
                        supabase.storage.from_("cards").upload(
                            f"{code}.json", card_data,
                            {"content-type": "application/json", "upsert": "true"},
                        )
                        print(f"  ✓ uploaded cards/{code}.json ({len(card_data) / 1024:.0f} KB)")
                        card_ok += 1
                    except Exception as e:
                        print(f"  ✗ card upload failed: {e}")
                        card_err += 1

        # ── Upload logo ────────────────────────────────────────────────────────
        if not args.skip_logos:
            logo_path = logos_dir / f"{code}.png"
            logo_url  = entry.get("logoUrl")

            logo_bytes: bytes | None = None
            if logo_path.exists():
                logo_bytes = logo_path.read_bytes()
                print(f"  Using local logo ({logo_path.stat().st_size / 1024:.0f} KB)")
            elif logo_url:
                print(f"  Downloading logo from {logo_url}…", end=" ", flush=True)
                logo_bytes = fetch_bytes(logo_url, label="logo")
                if logo_bytes:
                    print(f"{len(logo_bytes) / 1024:.0f} KB")
            else:
                print("  ⚠️  no logo available")

            if logo_bytes:
                if args.dry_run:
                    print(f"  [dry-run] would upload logos/{code}.png ({len(logo_bytes)} bytes)")
                else:
                    try:
                        supabase.storage.from_("logos").upload(
                            f"{code}.png", logo_bytes,
                            {"content-type": "image/png", "upsert": "true"},
                        )
                        print(f"  ✓ uploaded logos/{code}.png")
                        logo_ok += 1
                    except Exception as e:
                        print(f"  ✗ logo upload failed: {e}")
                        logo_err += 1

    print("\n" + "=" * 60)
    print("SUMMARY")
    print(f"  Sets upserted:   {db_ok}  errors: {db_err}")
    print(f"  Cards uploaded:  {card_ok}  errors: {card_err}")
    print(f"  Logos uploaded:  {logo_ok}  errors: {logo_err}")
    if not args.dry_run and db_err + card_err + logo_err == 0:
        print("\n✅  Catalogue is live in Supabase.")


if __name__ == "__main__":
    main()
