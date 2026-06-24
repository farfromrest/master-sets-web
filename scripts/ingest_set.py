#!/usr/bin/env python3
"""
ingest_set.py — Convert tab-separated promo set data into Master Setting data files.

Expected input columns (tab-separated):
  [row_id]  set_name  card_number  pokedex_num  card_name  type  source  [notes...]

row_id may be empty. card_number "--" rows are skipped (unnumbered cards).

Variant rules (applied per card number):
  source contains "Jumbo"                          → excluded
  source contains "Staff"                          → staff
  source contains "Pokémon Center Stamp"           → pokemon_center
  everything else                                  → normal

Usage:
  python3 scripts/ingest_set.py data.tsv \\
      --set-code mep \\
      --set-name "MEP Black Star Promos" \\
      --series "Mega Evolution" \\
      --release 2025/09/26

  cat data.tsv | python3 scripts/ingest_set.py - --set-code mep ...

  python3 scripts/ingest_set.py data.tsv --set-code mep ... --dry-run
"""

import argparse
import json
import sys
from collections import OrderedDict
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR     = PROJECT_ROOT / "data"
SETS_FILE    = DATA_DIR / "sets.json"
SETS_DIR     = DATA_DIR / "sets"


# ── Variant detection ──────────────────────────────────────────────────────────

def classify_source(source: str) -> str | None:
    """Map a source description to a variant key, or None to exclude the row."""
    s = source.lower()
    if "jumbo" in s:
        return None
    if "staff" in s:
        return "staff"
    if "pokémon center stamp" in s or "pokemon center stamp" in s:
        return "pokemon_center"
    return "normal"


# ── Parsing ────────────────────────────────────────────────────────────────────

def parse_tsv(lines: list[str]) -> list[dict]:
    rows = []
    for line in lines:
        line = line.rstrip("\n")
        if not line.strip():
            continue
        parts = [p.strip() for p in line.split("\t")]
        while len(parts) < 7:
            parts.append("")
        # Col 0 is always row_id (numeric or empty).
        # Col 1 = set_name, 2 = card_num, 3 = pokedex, 4 = card_name, 5 = type, 6 = source
        rows.append({
            "card_num":  parts[2],
            "card_name": parts[4],
            "source":    parts[6],
        })
    return rows


def build_cards(rows: list[dict], set_code: str) -> list[dict]:
    seen: OrderedDict[str, dict] = OrderedDict()

    for row in rows:
        num = row["card_num"]
        if not num or num == "--":
            continue

        variant = classify_source(row["source"])
        if variant is None:
            continue

        if num not in seen:
            seen[num] = {"name": row["card_name"], "variants": []}

        if variant not in seen[num]["variants"]:
            seen[num]["variants"].append(variant)

    return [
        {
            "id":          f"{set_code}-{num}",
            "cardNumber":  num,
            "cardName":    data["name"],
            "imageUrl":    None,
            "variants":    data["variants"],
        }
        for num, data in seen.items()
    ]


# ── sets.json update ───────────────────────────────────────────────────────────

def update_sets_json(set_code, set_name, series, release, card_count, total_slots, dry_run):
    sets = json.loads(SETS_FILE.read_text(encoding="utf-8"))

    entry = {
        "setCode":          set_code,
        "setName":          set_name,
        "seriesName":       series,
        "releaseDate":      release,
        "logoUrl":          None,
        "cardCount":        card_count,
        "totalCollectibles": total_slots,
    }

    existing_idx = next((i for i, s in enumerate(sets) if s["setCode"] == set_code), None)

    if existing_idx is not None:
        sets[existing_idx] = entry
        action = "updated"
    else:
        insert_at = next(
            (i for i, s in enumerate(sets) if s["releaseDate"] <= release),
            len(sets),
        )
        sets.insert(insert_at, entry)
        action = "inserted"

    if dry_run:
        print(f"  [dry-run] would {action} sets.json entry")
    else:
        SETS_FILE.write_text(json.dumps(sets, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"  ✓ {action} sets.json entry")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("tsv", help="Path to tab-separated input file, or - for stdin")
    parser.add_argument("--set-code",  required=True, help="Set code (e.g. mep)")
    parser.add_argument("--set-name",  required=True, help="Display name (e.g. 'MEP Black Star Promos')")
    parser.add_argument("--series",    required=True, help="Series name (e.g. 'Mega Evolution')")
    parser.add_argument("--release",   required=True, help="Release date YYYY/MM/DD")
    parser.add_argument("--dry-run",   action="store_true", help="Print changes without writing")
    args = parser.parse_args()

    if args.tsv == "-":
        lines = sys.stdin.readlines()
    else:
        lines = Path(args.tsv).read_text(encoding="utf-8").splitlines()

    rows  = parse_tsv(lines)
    cards = build_cards(rows, args.set_code)

    total_slots = sum(len(c["variants"]) for c in cards)

    variant_counts: dict[str, int] = {}
    for c in cards:
        for v in c["variants"]:
            variant_counts[v] = variant_counts.get(v, 0) + 1

    print(f"Cards:  {len(cards)}")
    print(f"Slots:  {total_slots}")
    for v, n in sorted(variant_counts.items()):
        print(f"  {v}: {n}")

    out_path = SETS_DIR / f"{args.set_code}.json"
    if out_path.exists() and not args.dry_run:
        print(f"\nOverwriting existing {out_path.name}")

    if args.dry_run:
        print(f"\n[dry-run] would write {out_path}")
    else:
        out_path.write_text(json.dumps(cards, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n✓ wrote {out_path}")

    update_sets_json(
        args.set_code, args.set_name, args.series, args.release,
        len(cards), total_slots, args.dry_run,
    )

    print(f"""
Next steps:
  python3 scripts/fetch_logos.py --discover   # find and download logo
  python3 scripts/fetch_sets.py --fetch-images  # populate imageUrls
  python3 scripts/upload_catalogue.py --sets {args.set_code}""")


if __name__ == "__main__":
    main()
