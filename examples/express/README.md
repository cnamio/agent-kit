# Custom domains for an Express SaaS, with Cnamio

Your users type their domain (`shop.customer.com`); the app asks Cnamio where its DNS lives, creates the records with
the user's DNS provider token when they give one, or shows the exact records to copy, and follows the connection until
it is live. Existing DNS records are never changed or deleted.

## Run it (no account needed)

```bash
npm install
npm run dev        # downloads the Cnamio SDK file into lib/cnamio-sdk/, then http://localhost:3000
```

Without credentials the app runs on the **Cnamio sandbox**: a 30-minute session from
`POST https://api.cnamio.com/v1/agent/sandbox`, renewed by itself. Nothing real is read or written: any domain
connects, `conflict.<domain>` has a record in the way, `pending.<domain>` never propagates, provider token `invalid`
is refused.

```bash
npm test           # offline: the Cnamio API is faked
npm run smoke      # online: one connection end to end against the sandbox (or your application)
```

## Switch to your own application

1. Create a free account at https://cnamio.com/?utm_source=agent-kit&utm_medium=agent#start (or let your coding agent
   start it for you with the MCP tool `start_signup`). It comes with a test application and a live one.
2. In the dashboard, generate the secret of the test application.
3. `cp .env.example .env` and set `CNAMIO_APPLICATION_ID`, `CNAMIO_SECRET` and `CNAMIO_OWNERSHIP_KEY` (any long random
   string). Restart `npm run dev`. Switch to the live application's credentials when it works.
4. Register `https://<your app>/webhooks/cnamio` as the webhook URL and set `CNAMIO_WEBHOOK_SECRET`: the
   `domain.added` webhook is the only signal that a domain is connected.

## What is where

| File | What it does |
| --- | --- |
| `lib/cnamio-client.mjs` | The SDK with your credentials, or with a sandbox session when there are none; per-user records (a CNAME plus an ownership TXT) |
| `lib/domains.mjs` | Check, connect (automatic with a provider token, else manual), status, webhook verification |
| `server.mjs` | Express routes: `POST /api/domains`, `GET /api/domains/:jobId`, `POST /webhooks/cnamio` (raw body, before `express.json()`) |
| `public/index.html` | A minimal page to try it |

The SDK is one file with no dependencies, saved from https://cnamio.com/sdk/cnamio.mjs (types:
https://cnamio.com/sdk/cnamio.d.mts) by `scripts/get-sdk.mjs`; there is no npm package to install yet. In your own
project, commit the file. The connect window for the browser (a ready-made UI) is in the
[Express recipe](https://cnamio.com/recipes/express.md).

Rules: the secret stays on the server; never store or log a DNS provider token; treat the webhook as the source of truth.

MIT license.
