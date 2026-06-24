#!/usr/bin/env python3
"""Download and optimize set logos for bundling.

Reads data/sets.json, downloads each logo URL, resizes to 200px wide
(preserving aspect ratio), and saves as data/logos/{setCode}.png.

Skips sets that already have a logo on disk unless --force is passed.
Skips sets with no logoUrl.

Usage:
    python3 scripts/fetch_logos.py            # download missing logos only
    python3 scripts/fetch_logos.py --force    # re-download all logos
"""

import json
import os
import subprocess
import sys
import tempfile
import urllib.request

SETS_JSON = os.path.join(os.path.dirname(__file__), '..', 'data', 'sets.json')
LOGOS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'logos')
TARGET_WIDTH = 200


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
    force = '--force' in sys.argv

    os.makedirs(LOGOS_DIR, exist_ok=True)

    with open(SETS_JSON) as f:
        sets = json.load(f)

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
            print(f'  [{code}] {name} — no logoUrl, skipping')
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

    print(f'\nDone: {downloaded} downloaded, {skipped} already cached, {no_url} no URL, {failed} failed')
    total_size = sum(os.path.getsize(os.path.join(LOGOS_DIR, f)) for f in os.listdir(LOGOS_DIR) if f.endswith('.png'))
    print(f'Total logos dir: {total_size / 1024:.0f} KB ({len(os.listdir(LOGOS_DIR))} files)')


if __name__ == '__main__':
    main()
