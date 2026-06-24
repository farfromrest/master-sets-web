#!/usr/bin/env python3
"""
fetch_sets.py — Enriches manually-maintained Pokémon TCG set and card data
with metadata and image URLs from the Pokémon TCG API.

The canonical data lives in:
  data/sets.json          — set list (some fields may be null initially)
  data/sets/{setCode}.json — card list per set (maintained by hand)

This script NEVER invents card entries. It only fills in null values.

Usage:
  python3 scripts/fetch_sets.py                    # enrich nulls only
  python3 scripts/fetch_sets.py --dry-run          # print changes without writing
  python3 scripts/fetch_sets.py --force            # overwrite existing values too
  python3 scripts/fetch_sets.py --refresh-cache    # re-fetch the API set catalogue
  python3 scripts/fetch_sets.py --fetch-images     # fetch real image URLs from the API
                                                   # (required for sets whose images are
                                                   # not hosted on images.pokemontcg.io)

API Key (optional, increases rate limit from ~1 000 to 20 000 req/day):
  export POKEMONTCG_API_KEY=your_key_here
"""

import argparse
import json
import os
import ssl
import sys
import time
import urllib.parse
import warnings
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

warnings.filterwarnings("ignore", message="Unverified HTTPS")

def _unverified_context(*args, **kwargs):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

ssl.create_default_context        = _unverified_context
ssl._create_default_https_context = _unverified_context

# ── Paths ──────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR     = PROJECT_ROOT / "data"
SETS_FILE    = DATA_DIR / "sets.json"
SETS_DIR     = DATA_DIR / "sets"
CACHE_DIR    = Path(__file__).parent / "cache"
CACHE_FILE   = CACHE_DIR / "pokemontcg_sets.json"

# ── Constants ──────────────────────────────────────────────────────────────────

PTCG_BASE       = "https://api.pokemontcg.io/v2"
RETRY_COUNT     = 3
# Fallback image URL used when --fetch-images is not set.
# Only works for sets whose images are hosted on images.pokemontcg.io.
# Newer sets (e.g. me3, me4) use scrydex.com — run --fetch-images for those.
IMAGE_TEMPLATE        = "https://images.pokemontcg.io/{setCode}/{cardNumber}_hires.png"
SCRYDEX_TEMPLATE      = "https://images.scrydex.com/pokemon/{setCode}-{cardNumber}/large"

# Canonical field order for stable diffs
SET_FIELD_ORDER  = ["setCode", "setName", "seriesName", "releaseDate",
                    "logoUrl", "cardCount", "totalCollectibles"]
CARD_FIELD_ORDER = ["id", "cardNumber", "cardName", "imageUrl", "variants"]

# ── API key ────────────────────────────────────────────────────────────────────

_API_KEY = os.environ.get("POKEMONTCG_API_KEY", "")

# ── HTTP helper ────────────────────────────────────────────────────────────────

def api_get(path, params=None):
    """Fetch one endpoint from the Pokémon TCG API with retries."""
    url = f"{PTCG_BASE}/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    headers = {"User-Agent": "Master Setting/3.0"}
    if _API_KEY:
        headers["X-Api-Key"] = _API_KEY

    for attempt in range(RETRY_COUNT):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except HTTPError as exc:
            if exc.code == 429:
                wait = 30 * (attempt + 1)
                print(f"  Rate limited — waiting {wait}s…")
                time.sleep(wait)
            elif attempt < RETRY_COUNT - 1:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"HTTP {exc.code}: {url}") from exc
        except (URLError, TimeoutError) as exc:
            if attempt < RETRY_COUNT - 1:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"Request failed: {url}: {exc}") from exc
    raise RuntimeError(f"Exhausted retries for {url}")

# ── API catalogue cache ────────────────────────────────────────────────────────

def load_api_catalogue():
    """Return the full set list from the API, using a local cache if available."""
    if CACHE_FILE.exists():
        cached = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        print(f"Using cached API catalogue ({len(cached)} sets, "
              f"{CACHE_FILE.relative_to(PROJECT_ROOT)})")
        return cached

    print("Fetching set catalogue from pokemontcg.io…")
    try:
        data = api_get("sets", {"orderBy": "releaseDate", "pageSize": "250"})
    except RuntimeError as exc:
        raise RuntimeError(f"Could not fetch API catalogue: {exc}") from exc

    sets = data.get("data", [])
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(sets, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Cached {len(sets)} sets → {CACHE_FILE.relative_to(PROJECT_ROOT)}")
    return sets

# ── Set matching ───────────────────────────────────────────────────────────────

def find_api_set(set_name, api_sets):
    """
    Find the best API match for set_name.
    Returns the matched set dict or None.
    Warns if more than one candidate exists.
    """
    name_lower = set_name.lower().strip()

    exact = [s for s in api_sets if s.get("name", "").lower().strip() == name_lower]
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        ids = [s["id"] for s in exact]
        print(f"  ⚠️  Multiple exact matches for '{set_name}': {ids} — using first")
        return exact[0]

    # Fall back to substring match
    partial = [s for s in api_sets if name_lower in s.get("name", "").lower()]
    if len(partial) == 1:
        return partial[0]
    if len(partial) > 1:
        ids = [s["id"] for s in partial]
        print(f"  ⚠️  Multiple partial matches for '{set_name}': {ids} — using first")
        return partial[0]

    return None

# ── Helpers ────────────────────────────────────────────────────────────────────

def fetch_api_image_urls(set_id):
    """
    Fetch the API-provided image URLs for all cards in a set.
    Returns a dict mapping cardNumber (string) → large image URL.
    Uses images.large, falling back to images.small.
    """
    results, page = [], 1
    while True:
        params = urllib.parse.urlencode({
            "q": f"set.id:{set_id}",
            "orderBy": "number",
            "page": page,
            "pageSize": "250",
        })
        data = api_get("cards", {"q": f"set.id:{set_id}", "orderBy": "number",
                                  "page": str(page), "pageSize": "250"})
        results.extend(data.get("data", []))
        if len(results) >= data.get("totalCount", 0):
            break
        page += 1

    url_map = {}
    seen = set()
    for c in results:
        if c["id"] not in seen:
            seen.add(c["id"])
            imgs = c.get("images") or {}
            url = imgs.get("large") or imgs.get("small")
            if url:
                url_map[c["number"]] = url
    return url_map


def normalize_date(raw):
    """Convert API date (YYYY/MM/DD or YYYY-MM-DD) to YYYY/MM/DD."""
    return raw.replace("-", "/") if raw else None

def reorder(d, field_order):
    """Return a new dict with keys in the given order, carrying over any extras."""
    result = {k: d.get(k) for k in field_order if k in d or k in field_order}
    # Include any fields not in the canonical order at the end
    for k in d:
        if k not in result:
            result[k] = d[k]
    return result

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    global _API_KEY

    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--dry-run",       action="store_true",
                        help="Print changes without writing files")
    parser.add_argument("--force",         action="store_true",
                        help="Overwrite existing non-null values")
    parser.add_argument("--api-key",       metavar="KEY",
                        help="pokemontcg.io API key (overrides env var)")
    parser.add_argument("--refresh-cache", action="store_true",
                        help="Delete and re-fetch the API set catalogue cache")
    parser.add_argument("--sets",          metavar="CODES",
                        help="Comma-separated set codes to process (e.g. me3,me4)")
    parser.add_argument("--fetch-images",  action="store_true",
                        help="Fetch real image URLs from the API cards endpoint "
                             "(required for sets not hosted on images.pokemontcg.io)")
    args = parser.parse_args()

    if args.api_key:
        _API_KEY = args.api_key

    if args.dry_run:
        print("DRY RUN — no files will be written.\n")

    # ── Load sets.json ─────────────────────────────────────────────────────────

    if not SETS_FILE.exists():
        sys.exit(f"Error: {SETS_FILE.relative_to(PROJECT_ROOT)} not found. Create it first.")

    try:
        raw_sets = json.loads(SETS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        sys.exit(f"Error: invalid JSON in sets.json: {exc}")

    if not isinstance(raw_sets, list):
        sys.exit("Error: sets.json must be a JSON array.")

    # ── Decide whether we need the API ────────────────────────────────────────

    if args.refresh_cache and CACHE_FILE.exists():
        CACHE_FILE.unlink()
        print("Deleted API cache — will re-fetch.\n")

    needs_api = args.force or any(
        s.get("setCode") is None
        or s.get("releaseDate") is None
        for s in raw_sets
    )

    api_sets = []
    if needs_api:
        try:
            api_sets = load_api_catalogue()
        except RuntimeError as exc:
            print(f"Warning: {exc}\nProceeding without API metadata.\n")

    all_sets = list(raw_sets)  # keep full list for writing sets.json back

    if args.sets:
        filter_codes = {s.strip() for s in args.sets.split(",")}
        raw_sets = [s for s in raw_sets if s.get("setCode") in filter_codes]
        if not raw_sets:
            sys.exit(f"No matching sets found for: {args.sets}")

    print(f"\nProcessing {len(raw_sets)} set(s)\n" + "=" * 60)

    # ── Per-set counters ───────────────────────────────────────────────────────

    sets_updated       = 0
    card_files_updated = 0
    missing_card_files = []
    unresolved_sets    = []
    warnings           = []

    updated_by_code = {}  # setCode -> updated entry

    output_sets = []

    for _raw_entry in raw_sets:
        set_name = _raw_entry.get("setName") or "(unnamed)"
        set_code = _raw_entry.get("setCode")

        print(f"\n[{set_code or '?'}]  {set_name}")

        entry = dict(_raw_entry)  # shallow copy so we don't mutate the original
        entry_changed = False

        try:
            # ── Resolve set metadata ───────────────────────────────────────────

            missing_meta = (
                entry.get("setCode") is None
                or entry.get("releaseDate") is None
            )

            if api_sets and (missing_meta or args.force):
                api_match = find_api_set(set_name, api_sets)
                if api_match:
                    print(f"  Matched: {api_match['id']} ({api_match['name']})")

                    def fill(field, value):
                        nonlocal entry_changed
                        if value is not None and value != "" and (
                            entry.get(field) is None or args.force
                        ):
                            if entry.get(field) != value:
                                entry[field] = value
                                entry_changed = True
                                print(f"  + {field} = {value}")

                    fill("setCode",     api_match.get("id"))
                    fill("releaseDate", normalize_date(api_match.get("releaseDate", "")))
                    fill("logoUrl",     (api_match.get("images") or {}).get("logo"))
                    set_code = entry.get("setCode")
                else:
                    msg = f"No API match for '{set_name}'"
                    print(f"  ⚠️  {msg}")
                    warnings.append(msg)
                    unresolved_sets.append(set_name)

            # ── Process card file ──────────────────────────────────────────────

            if not set_code:
                entry["cardCount"]         = entry.get("cardCount", 0)
                entry["totalCollectibles"] = entry.get("totalCollectibles", 0)
            else:
                card_file = SETS_DIR / f"{set_code}.json"

                if not card_file.exists():
                    msg = f"Card file not found: data/sets/{set_code}.json"
                    print(f"  ⚠️  {msg}")
                    warnings.append(msg)
                    missing_card_files.append(set_code)
                    entry["cardCount"]         = 0
                    entry["totalCollectibles"] = 0
                else:
                    try:
                        cards = json.loads(card_file.read_text(encoding="utf-8"))
                    except json.JSONDecodeError as exc:
                        msg = f"Invalid JSON in data/sets/{set_code}.json: {exc}"
                        print(f"  ✗ {msg}")
                        warnings.append(msg)
                        cards = None

                    if isinstance(cards, list):
                        cards_changed = False
                        updated_cards = []

                        # Fetch real API image URLs when requested
                        api_image_map = {}
                        image_template = IMAGE_TEMPLATE
                        if args.fetch_images:
                            print(f"  Fetching image URLs from API…", end="", flush=True)
                            try:
                                api_image_map = fetch_api_image_urls(set_code)
                                print(f" {len(api_image_map)} found")
                            except Exception as exc:
                                print(f" failed ({exc})")

                            # If the API had nothing, probe pokemontcg.io vs scrydex
                            if not api_image_map and cards:
                                first_num = next(
                                    (c.get("cardNumber") for c in cards if c.get("cardNumber")),
                                    None,
                                )
                                if first_num:
                                    ptcg_probe = IMAGE_TEMPLATE.format(setCode=set_code, cardNumber=first_num)
                                    try:
                                        req = Request(ptcg_probe, method="HEAD",
                                                      headers={"User-Agent": "Master Setting/1.0"})
                                        with urlopen(req, timeout=10) as r:
                                            ptcg_ok = r.status == 200
                                    except Exception:
                                        ptcg_ok = False
                                    if not ptcg_ok:
                                        image_template = SCRYDEX_TEMPLATE
                                        print(f"  pokemontcg.io has no images for {set_code}, using scrydex fallback")

                        for card in cards:
                            card = dict(card)
                            card_num = card.get("cardNumber")
                            if not card_num:
                                warnings.append(f"Card missing cardNumber in {set_code}.json (id={card.get('id','?')})")
                                updated_cards.append(reorder(card, CARD_FIELD_ORDER))
                                continue

                            # Prefer real API URL when available, fall back to template
                            expected_url = (
                                api_image_map.get(card_num)
                                or image_template.format(setCode=set_code, cardNumber=card_num)
                            )
                            if card.get("imageUrl") is None or args.force:
                                if card.get("imageUrl") != expected_url:
                                    card["imageUrl"] = expected_url
                                    cards_changed = True
                            updated_cards.append(reorder(card, CARD_FIELD_ORDER))

                        card_count         = len(cards)
                        total_collectibles = sum(len(c.get("variants") or []) for c in cards)

                        if (entry.get("cardCount") != card_count
                                or entry.get("totalCollectibles") != total_collectibles):
                            entry_changed = True

                        entry["cardCount"]         = card_count
                        entry["totalCollectibles"] = total_collectibles

                        print(f"  {card_count} cards  |  {total_collectibles} collectibles")

                        if cards_changed:
                            card_files_updated += 1
                            if args.dry_run:
                                print(f"  [dry-run] Would fill imageUrl for cards in {set_code}.json")
                            else:
                                card_file.write_text(
                                    json.dumps(updated_cards, indent=2, ensure_ascii=False),
                                    encoding="utf-8",
                                )
                                print(f"  ✓ Updated {set_code}.json")
                        else:
                            print(f"  ✓ {set_code}.json up to date")

        except Exception as exc:
            msg = f"Unexpected error processing '{set_name}': {exc}"
            print(f"  ✗ {msg}")
            warnings.append(msg)

        # Always preserve the entry in output regardless of what happened above
        if entry_changed:
            sets_updated += 1
        updated_by_code[set_code] = reorder(entry, SET_FIELD_ORDER)

    # Merge updates back into the full set list to avoid clobbering unprocessed sets
    output_sets = [
        updated_by_code.get(s.get("setCode"), reorder(s, SET_FIELD_ORDER))
        for s in all_sets
    ]

    # ── Write sets.json ────────────────────────────────────────────────────────

    if args.dry_run:
        if sets_updated:
            print(f"\n[dry-run] Would update {sets_updated} set(s) in sets.json")
        else:
            print(f"\n[dry-run] sets.json is up to date")
    else:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        SETS_FILE.write_text(
            json.dumps(output_sets, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    # ── Summary ────────────────────────────────────────────────────────────────

    print("\n" + "=" * 60)
    print("SUMMARY\n")
    print(f"  Sets updated:        {sets_updated}")
    print(f"  Card files updated:  {card_files_updated}")
    if missing_card_files:
        print(f"  Missing card files:  {len(missing_card_files)}")
        for code in missing_card_files:
            print(f"    data/sets/{code}.json")
    if unresolved_sets:
        print(f"  Unresolved sets:     {len(unresolved_sets)}")
        for name in unresolved_sets:
            print(f"    {name}")
    print(f"  Total warnings:      {len(warnings)}")
    for w in warnings:
        print(f"    ⚠️  {w}")

    if not args.dry_run:
        print(f"\n✅  data/sets.json written ({len(output_sets)} sets)")


if __name__ == "__main__":
    main()
