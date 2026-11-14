#!/usr/bin/env python3
"""
scripts/check_links.py - Resource URL Health Checker
Performs HEAD requests against every URL in backend/data/resources.json and prints failures.
"""

import json
import sys
from pathlib import Path
import urllib.request
import urllib.error

DATA_FILE = Path(__file__).resolve().parent.parent / "backend" / "data" / "resources.json"


def check_url(url: str, timeout: int = 8) -> tuple[bool, int, str]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    # First attempt: HEAD request
    req = urllib.request.Request(url, headers=headers, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return True, response.status, "OK"
    except urllib.error.HTTPError as e:
        # Some servers reject HEAD with 403 or 405; fallback to GET with range or simple stream
        if e.code in (403, 405):
            get_req = urllib.request.Request(url, headers=headers, method="GET")
            try:
                with urllib.request.urlopen(get_req, timeout=timeout) as response:
                    return True, response.status, "OK (via GET fallback)"
            except urllib.error.HTTPError as ge:
                return False, ge.code, f"HTTP Error {ge.code}: {ge.reason}"
            except Exception as ge:
                return False, 0, f"GET Error: {ge}"
        return False, e.code, f"HTTP Error {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return False, 0, f"URL Error: {e.reason}"
    except Exception as e:
        return False, 0, f"Request failed: {e}"


def main():
    if not DATA_FILE.exists():
        print(f"Error: {DATA_FILE} does not exist", file=sys.stderr)
        sys.exit(1)

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        resources = json.load(f)

    print(f"Checking {len(resources)} resources from {DATA_FILE.name}...\n")

    failures = []
    successes = 0

    for idx, r in enumerate(resources, 1):
        r_id = r.get("id", "unknown")
        url = r.get("url", "")
        print(f"[{idx}/{len(resources)}] Checking {r_id} ({url})...", end=" ", flush=True)

        ok, code, msg = check_url(url)
        if ok:
            print(f"PASS ({code})")
            successes += 1
        else:
            print(f"FAIL ({code}) - {msg}")
            failures.append((r_id, url, code, msg))

    print("\n" + "=" * 50)
    print(f"Summary: {successes} Passed, {len(failures)} Failed out of {len(resources)} total.")
    print("=" * 50)

    if failures:
        print("\nFailures:")
        for r_id, url, code, msg in failures:
            print(f"  - [{r_id}] {url} -> {msg}")
        sys.exit(1)
    else:
        print("\nAll URLs verified successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
