#!/usr/bin/env python3
"""
upload_catalogue.py — Upload PocketBinder catalogue data to Supabase.

Reads sets.json and per-set card JSON from a local data directory (defaults to
the sibling PocketBinder repo), then:
  • Upserts rows into the `sets` Postgres table
  • Uploads per-set card JSON to Supabase Storage (cards/{setCode}.json)
  • Uploads set logos to Supabase Storage (logos/{setCode}.png)

Requires:
  SUPABASE_URL         — project URL (e.g. https://xxx.supabase.co)
  SUPABASE_SERVICE_KEY — service role key from Dashboard → Settings → API

Usage:
  python3 scripts/upload_catalogue.py
  python3 scripts/upload_catalogue.py --data-dir /path/to/PocketBinder/data
  python3 scripts/upload_catalogue.py --sets sv1,sv2
  python3 scripts/upload_catalogue.py --dry-run
"""

import argparse
import json
import os
import sys
import tempfile
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

from supabase import create_client, Client


# ── Defaults ───────────────────────────────────────────────────────────────────

DEFAULT_DATA_DIR = Path(__file__).parent.parent.parent / "PocketBinder" / "data"


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
        "logo_url":    entry.get("logoUrl"),
        "card_count":  entry.get("cardCount", 0),
        "total_slots": entry.get("totalCollectibles", 0),
    }


def fetch_logo_bytes(url: str) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MasterSets/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read()
    except Exception as e:
        print(f"    ✗ download failed: {e}")
        return None


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

        # ── Upload card JSON ───────────────────────────────────────────────────
        if not args.skip_cards:
            card_file = sets_dir / f"{code}.json"
            if not card_file.exists():
                print(f"  ⚠️  card file not found: {card_file}")
                card_err += 1
            else:
                card_data = card_file.read_bytes()
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
                logo_bytes = fetch_logo_bytes(logo_url)
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
