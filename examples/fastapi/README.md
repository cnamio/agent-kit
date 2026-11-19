# Custom domains for a FastAPI SaaS, with Cnamio

Your users type their domain (`shop.customer.com`); the app asks Cnamio where its DNS lives, creates the records with
the user's DNS provider token when they give one, or returns the exact records to copy, and follows the connection
until it is live. Existing DNS records are never changed or deleted.

## Run it (no account needed)

Python 3.10+.

```bash
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python scripts/get_sdk.py                         # saves the Cnamio SDK file as app/cnamio.py
uvicorn app.main:app --reload                     # http://localhost:8000
```

Without credentials the app runs on the **Cnamio sandbox**: a 30-minute session from
`POST https://api.cnamio.com/v1/agent/sandbox`, renewed by itself. Nothing real is read or written: any domain
connects, `conflict.<domain>` has a record in the way, `pending.<domain>` never propagates, provider token `invalid`
is refused.

```bash
pytest                       # offline: the Cnamio API is faked (downloads the SDK file first if it is missing)
python scripts/smoke.py      # online: one connection end to end against the sandbox (or your application)
```

## Switch to your own application

1. Create a free account at https://cnamio.com/?utm_source=agent-kit&utm_medium=agent#start (or let your coding agent
   start it for you with the MCP tool `start_signup`). It comes with a test application and a live one.
2. In the dashboard, generate the secret of the test application.
3. Set `CNAMIO_APPLICATION_ID`, `CNAMIO_SECRET` and `CNAMIO_OWNERSHIP_KEY` (any long random string) in the server
   environment (see `.env.example`) and restart. Switch to the live application's credentials when it works.
4. Register `https://<your app>/webhooks/cnamio` as the webhook URL and set `CNAMIO_WEBHOOK_SECRET`: the
   `domain.added` webhook is the only signal that a domain is connected.

## What is where

| File | What it does |
| --- | --- |
| `app/cnamio_client.py` | The SDK with your credentials, or with a sandbox session when there are none (`SandboxCnamio`); per-user records (a CNAME plus an ownership TXT) |
| `app/domains.py` | Check, connect (automatic with a provider token, else manual), status, webhook verification |
| `app/main.py` | FastAPI routes: `POST /api/domains`, `GET /api/domains/{job_id}`, `POST /webhooks/cnamio` (raw body) |
| `app/static/index.html` | A minimal page to try it |

The SDK is one file using only the standard library, saved from https://cnamio.com/sdk/cnamio.py by
`scripts/get_sdk.py`; there is no PyPI package to install yet. In your own project, commit the file. The connect window
for the browser is described in the [Django recipe](https://cnamio.com/recipes/django.md) (the same calls apply).

Rules: the secret stays on the server; never store or log a DNS provider token; treat the webhook as the source of truth.

MIT license.
