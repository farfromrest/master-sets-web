#!/usr/bin/env python3
"""Download and optimize set logos for bundling.

Reads data/sets.json, downloads each logo URL, resizes to 200px wide
(preserving aspect ratio), and saves as data/logos/{setCode}.png.

Skips sets that already have a logo on disk unless --force is passed.
Skips sets with no logoUrl unless --discover is passed.

Usage:
    python3 scripts/fetch_logos.py              # download missing logos only
    python3 scripts/fetch_logos.py --force      # re-download all logos
    python3 scripts/fetch_logos.py --discover   # find logos for sets with no logoUrl
"""

import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from urllib.error import URLError, HTTPError

SETS_JSON = os.path.join(os.path.dirname(__file__), '..', 'data', 'sets.json')
LOGOS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'logos')
TARGET_WIDTH = 200

# Ordered list of URL patterns to try when discovering a logo.
# {code} is replaced with the set code.
LOGO_CANDIDATES = [
    "https://images.pokemontcg.io/{code}/logo.png",
    "https://images.scrydex.com/pokemon/{code}-logo/logo",
    "https://images.scrydex.com/pokemon/{code}/logo",
]


def probe_url(url: str) -> bool:
    """Return True if a HEAD request to url returns 200."""
    try:
        req = urllib.request.Request(url, method='HEAD',
                                     headers={'User-Agent': 'Master Setting/1.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status == 200
    except (URLError, HTTPError):
        return False


def discover_logo_url(code: str) -> str | None:
    """Try known URL patterns and return the first one that resolves."""
    for pattern in LOGO_CANDIDATES:
        url = pattern.format(code=code)
        if probe_url(url):
            return url
    return None


def download_and_resize(url: str, output_path: str) -> bool:
    """Download image from URL and resize to TARGET_WIDTH using sips."""
    try:
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp_path = tmp.name

        req = urllib.request.Request(url, headers={'User-Agent': 'Master Setting/1.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            with open(tmp_path, 'wb') as f:
                f.write(resp.read())

        subprocess.run(
            ['sips', '--resampleWidth', str(TARGET_WIDTH), tmp_path, '--out', output_path],
            capture_output=True, check=True,
        )
        return True
    except Exception as e:
        print(f'    ✗ Failed: {e}')
        return False
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def main():
    force    = '--force'    in sys.argv
    discover = '--discover' in sys.argv

    os.makedirs(LOGOS_DIR, exist_ok=True)

    with open(SETS_JSON) as f:
        sets = json.load(f)

    sets_dirty = False
    downloaded = 0
    skipped = 0
    failed = 0
    no_url = 0

    print(f'Processing {len(sets)} set(s)\n')

    for entry in sets:
        code = entry.get('setCode', '?')
        name = entry.get('setName', code)
        url = entry.get('logoUrl')
        output = os.path.join(LOGOS_DIR, f'{code}.png')

        if not url:
            if not discover:
                print(f'  [{code}] {name} — no logoUrl, skipping')
                no_url += 1
                continue
            print(f'  [{code}] {name} — discovering logo URL…', end=' ', flush=True)
            url = discover_logo_url(code)
            if url:
                print(f'found: {url}')
                entry['logoUrl'] = url
                sets_dirty = True
            else:
                print('not found')
                no_url += 1
                continue

        if os.path.exists(output) and not force:
            skipped += 1
            continue

        print(f'  [{code}] {name} — downloading...', end=' ')
        if download_and_resize(url, output):
            size_kb = os.path.getsize(output) / 1024
            print(f'✓ {size_kb:.0f} KB')
            downloaded += 1
        else:
            failed += 1

    if sets_dirty:
        with open(SETS_JSON, 'w', encoding='utf-8') as f:
            json.dump(sets, f, indent=2, ensure_ascii=False)
            f.write('\n')
        print('\n✓ Updated sets.json with discovered logoUrls')

    print(f'\nDone: {downloaded} downloaded, {skipped} already cached, {no_url} no URL, {failed} failed')
    total_size = sum(os.path.getsize(os.path.join(LOGOS_DIR, f)) for f in os.listdir(LOGOS_DIR) if f.endswith('.png'))
    print(f'Total logos dir: {total_size / 1024:.0f} KB ({len(os.listdir(LOGOS_DIR))} files)')


if __name__ == '__main__':
    main()
