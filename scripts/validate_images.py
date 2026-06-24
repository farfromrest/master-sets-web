#!/usr/bin/env python3
"""Validate card image URLs across all set JSON files.

HEAD-checks every non-null imageUrl and reports broken ones.
Pass --fix to null out URLs that return non-200 responses.

Usage:
    python3 scripts/validate_images.py            # report only
    python3 scripts/validate_images.py --fix       # null out broken URLs
    python3 scripts/validate_images.py --set sv1   # check one set only
"""

import json
import os
import sys
import urllib.request
from urllib.error import URLError, HTTPError

SETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'sets')
TIMEOUT = 10


def check_url(url: str) -> int:
    """HEAD-check a URL and return the HTTP status code, or 0 on error."""
    try:
        req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Master Setting/1.0'})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.status
    except HTTPError as e:
        return e.code
    except (URLError, OSError):
        return 0


def validate_set(set_code: str, fix: bool) -> dict:
    """Validate all image URLs in a set file. Returns stats dict."""
    fpath = os.path.join(SETS_DIR, f'{set_code}.json')
    if not os.path.exists(fpath):
        print(f'  [{set_code}] file not found')
        return {'total': 0, 'checked': 0, 'ok': 0, 'broken': 0, 'null': 0, 'fixed': 0}

    cards = json.load(open(fpath))
    stats = {'total': len(cards), 'checked': 0, 'ok': 0, 'broken': 0, 'null': 0, 'fixed': 0}
    broken_cards = []

    for card in cards:
        url = card.get('imageUrl')
        if url is None:
            stats['null'] += 1
            continue

        stats['checked'] += 1
        status = check_url(url)

        if status == 200:
            stats['ok'] += 1
        else:
            stats['broken'] += 1
            broken_cards.append((card['id'], card.get('cardNumber', '?'), status, url))
            if fix:
                card['imageUrl'] = None
                stats['fixed'] += 1

    if broken_cards:
        print(f'  [{set_code}] {stats["broken"]} broken:')
        for card_id, num, status, url in broken_cards[:5]:
            print(f'    {card_id} #{num} → {status} {url.split("/")[-1]}')
        if len(broken_cards) > 5:
            print(f'    ... and {len(broken_cards) - 5} more')
    else:
        print(f'  [{set_code}] {stats["ok"]}/{stats["checked"]} OK ({stats["null"]} null)')

    if fix and stats['fixed'] > 0:
        with open(fpath, 'w') as f:
            json.dump(cards, f, indent=2, ensure_ascii=False)
        print(f'    → Fixed: nulled {stats["fixed"]} broken URLs')

    return stats


def main():
    fix = '--fix' in sys.argv
    single_set = None
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == '--set' and i + 1 < len(sys.argv):
            single_set = sys.argv[i + 1]

    if single_set:
        set_codes = [single_set]
    else:
        set_codes = sorted(f.replace('.json', '') for f in os.listdir(SETS_DIR) if f.endswith('.json'))

    mode = 'FIX' if fix else 'REPORT'
    print(f'Validating image URLs ({mode} mode, {len(set_codes)} sets)\n')

    totals = {'total': 0, 'checked': 0, 'ok': 0, 'broken': 0, 'null': 0, 'fixed': 0}

    for code in set_codes:
        stats = validate_set(code, fix)
        for k in totals:
            totals[k] += stats[k]

    print(f'\n{"=" * 50}')
    print(f'SUMMARY')
    print(f'  Total cards:    {totals["total"]}')
    print(f'  Checked:        {totals["checked"]}')
    print(f'  OK:             {totals["ok"]}')
    print(f'  Broken:         {totals["broken"]}')
    print(f'  Already null:   {totals["null"]}')
    if fix:
        print(f'  Fixed (nulled): {totals["fixed"]}')

    if totals['broken'] > 0 and not fix:
        print(f'\nRun with --fix to null out broken URLs.')


if __name__ == '__main__':
    main()
