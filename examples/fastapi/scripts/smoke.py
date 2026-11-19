"""End to end against the real Cnamio API: the sandbox without credentials, your application with them.
In the sandbox any domain connects at once, conflict.<domain> has a record in the way, and nothing real is touched.
Run from the example folder: python scripts/smoke.py [domain]"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.cnamio_client import create_cnamio  # noqa: E402
from app.domains import connect_domain, connection_status  # noqa: E402


def main() -> int:
    client = create_cnamio()
    domain = sys.argv[1] if len(sys.argv) > 1 else (f"shop-{int(time.time())}.example.com" if client.mode == "sandbox" else None)
    if not domain:
        print("With credentials, pass a test domain you own: python scripts/smoke.py links.yourdomain.com", file=sys.stderr)
        return 2
    print(f"Cnamio mode: {client.mode}; domain: {domain}")
    status, started = connect_domain(client, "smoke-user", domain)
    print("connect ->", status, started.get("setup") or started.get("error"), started.get("provider", ""))
    if status != 201:
        return 1
    for r in started["records"]:
        print(f"  {r['type']:<5} {r['host']}  {r['value']}")
    status, state = connection_status(client, started["jobId"])
    print("status ->", status, state.get("status"))
    if status != 200:
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
