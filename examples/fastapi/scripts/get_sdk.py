"""Saves the Cnamio server SDK (one file, standard library only) as app/cnamio.py, the way the Cnamio docs say to:
there is no PyPI package to install yet. Downloads only when the file is missing; --force fetches the latest again.
Commit the file in your own project."""
import sys
import urllib.request
from pathlib import Path

TARGET = Path(__file__).resolve().parent.parent / "app" / "cnamio.py"
URL = "https://cnamio.com/sdk/cnamio.py"


def main() -> int:
    if TARGET.exists() and "--force" not in sys.argv:
        return 0
    with urllib.request.urlopen(URL, timeout=30) as response:
        text = response.read().decode("utf-8")
    if "Cnamio server SDK" not in text[:200]:
        print(f"Could not download {URL}: unexpected content. Run python scripts/get_sdk.py again.", file=sys.stderr)
        return 1
    TARGET.write_text(text, encoding="utf-8")
    print(f"Saved {TARGET.relative_to(TARGET.parent.parent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
