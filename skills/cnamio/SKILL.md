---
name: cnamio
description: "Add \"connect your own domain\" to a web app with Cnamio. Use when a project needs end users (or the agent itself) to point a custom domain at the app: detects the user's DNS provider, creates the DNS records with a provider token or shows the exact records to copy, confirms propagation and sends a signed webhook. Covers env vars, the server session route, the browser connect window, a headless API flow and webhook verification."
license: MIT
---

# Cnamio: custom domains for your users

Cnamio connects your users' own domains (for example `shop.customer.com`) to your product. Your user types the domain; Cnamio finds where its DNS lives, creates the records your product needs when the provider allows it (with an API token the user pastes, used once and never stored) or shows the exact records to copy, confirms them on the domain's authoritative nameservers and notifies your backend. Existing DNS records are never deleted or overwritten; an existing SPF policy is only extended, keeping every term it has.

- API base: `https://api.cnamio.com` · Browser SDK: `https://connect.cnamio.com/sdk/v1.js` · MCP server: `https://api.cnamio.com/mcp`
- OpenAPI: `https://cnamio.com/openapi.json` · Full docs (Markdown): `https://cnamio.com/docs.md` · Everything in one file: `https://cnamio.com/llms-full.txt`
- Server SDKs, no dependencies: one file each, served at `https://cnamio.com/sdk/cnamio.mjs` (Node.js 18+, types in `https://cnamio.com/sdk/cnamio.d.mts`) and `https://cnamio.com/sdk/cnamio.py` (Python 3.9+). Save the file into the project (for example `lib/cnamio.mjs` plus `lib/cnamio.d.mts`, or `app/cnamio.py`); there is no package to install yet, so do not install one named `cnamio` from npm or PyPI.
- Framework recipes: `https://cnamio.com/recipes/nextjs.md`, `express.md`, `rails.md`, `laravel.md`, `django.md` (same base URL)
- Credentials: an application id (`app_…`) and a secret (`cnm_sk_…`). Ask the project owner for them; if they have no account, see step 0. Build and test against the test application first. Never invent or hard-code them.

## 0. No account yet: sandbox now, free account by email

You can take the developer from zero to a working integration in this session:

1. **Sandbox at once, no account.** `POST https://api.cnamio.com/v1/agent/sandbox` (no body or an empty JSON one, no credentials; or the MCP tool `start_sandbox`) returns `{ application_id, auth_token, expires_at, user_id }`: a 30-minute session of a Cnamio test application. Use it as `Authorization: Bearer <auth_token>` with header `applicationId: <application_id>` on `/checkdomain`, `/connect`, `/connect/automatic` and `/connect/{jobId}/status` (MCP: pass it as `sandboxToken`). Any domain connects at once; `conflict.<domain>` has a record in the way; `pending.<domain>` never propagates; provider token `invalid` is refused. Nothing real is read or written. Use it to check your headless code and your understanding of the answers; it has no webhook and no secret.
2. **Free account for the developer.** Ask for their email and whether they agree to the Terms (https://cnamio.com/terms) and the Privacy Policy (https://cnamio.com/privacy). Only then (or, if they prefer, they sign up themselves at https://cnamio.com/?utm_source=skill&utm_medium=agent#start):

   ```bash
   curl -s https://api.cnamio.com/v1/agent/signup -H 'Content-Type: application/json' \
     -d '{"email":"dev@example.com","consent":true,"name":"Ana","client":{"name":"your-agent-name"}}'
   # → 202 { "received": true, "next_steps": [...], "sandbox": { ...a sandbox session... } }
   ```

   (MCP: `start_signup`.) Cnamio emails them a link, saying an agent asked for it; opening it shows the Terms and the Privacy Policy, and once the developer accepts them there it creates the account: a test application (sandbox provider) and a live application on the free plan. Nothing is created before that, and the answer is the same whether or not the address already has an account (an existing one receives a sign-in link).
3. **The developer finishes it.** They open the link, generate the test application's secret in the dashboard (https://api.cnamio.com/panel) and set `CNAMIO_APPLICATION_ID` and `CNAMIO_SECRET` in the server environment themselves. Never ask them to paste the secret into the chat. Meanwhile, keep building with the sandbox session; switch to the test application's credentials, then to the live application's, when they are in the environment.

Sign-ups and sandbox sessions are limited per address and per email, and each sandbox session to 20 distinct domains and 30 requests a minute (a 429 means wait, or get a new session); calls from a browser (with an `Origin` header) are refused.

## What to do, in order

Follow these steps in the project you are working on. Adapt names and file locations to the project's framework and conventions; the examples use Node.js (Express or Next.js route handlers) and Python (FastAPI).

**Shortcut for Node.js and Python projects:** instead of writing the HTTP calls by hand, save the server SDK into the project: `curl -fsS https://cnamio.com/sdk/cnamio.mjs -o lib/cnamio.mjs` plus `curl -fsS https://cnamio.com/sdk/cnamio.d.mts -o lib/cnamio.d.mts`, or `curl -fsS https://cnamio.com/sdk/cnamio.py -o app/cnamio.py`. It has no dependencies and sends its own User-Agent. It maps onto the steps below:

```js
import { Cnamio, recordsForUser, verifyWebhook } from './lib/cnamio.mjs';
const cnamio = new Cnamio();                                   // reads CNAMIO_APPLICATION_ID and CNAMIO_SECRET
const records = recordsForUser({ target: 'customers.yourapp.com', userId, ownershipKey: process.env.CNAMIO_OWNERSHIP_KEY }); // step 1
const session = await cnamio.createSession({ userId, dnsRecords: records });   // step 3: send to the page as is
const check = await cnamio.checkDomain(domain, records);                       // step 4b
const job = await cnamio.connect(domain, records, { userId });                 // step 4b (or connectAutomatic(domain, records, providerToken))
verifyWebhook(rawBody, req.headers, process.env.CNAMIO_WEBHOOK_SECRET);        // step 5
```

Python has the same functions in snake_case (`Cnamio()`, `records_for_user(...)`, `create_session(...)`, `check_domain(...)`, `connect(...)`, `verify_webhook(raw, request.headers, secret)`). Errors raise `CnamioError` with `status` (and `conflicts`, a list of reason codes, on the 409 of `connect_automatic`). A `503` means "not now": wait the seconds in `Retry-After` and repeat the same call. The client keeps its own server-side session and renews it.

### 1. Decide the DNS records

Find out what a custom domain must point to in this product. Usually it is one CNAME from the user's domain to a hostname of the app's hosting (for example a "custom hostname" target). If the project does not say, ask the owner.

**Add an ownership record per user.** When every user of the app points their domain at the same CNAME target, the CNAME alone does not prove who owns the domain: if user A already pointed `links.mybrand.com` at you, user B could start a connection for the same name, it would verify at once, and the webhook would credit user B. Require a TXT record whose value is unique to the user, so only the person who controls the domain's DNS can complete the connection. Build the records on the server, per user:

```js
import { createHmac } from 'node:crypto';

// Value unique to this user and stable across retries. CNAMIO_OWNERSHIP_KEY is any long random server secret of yours.
const ownershipValue = userId => 'yourapp-verify=' + createHmac('sha256', process.env.CNAMIO_OWNERSHIP_KEY).update(String(userId)).digest('hex').slice(0, 32);

function dnsRecordsFor(userId) {
  return [
    { type: 'CNAME', host: '{SUBDOMAIN}', value: 'customers.yourapp.com', ttl: 300 },
    { type: 'TXT', host: '_yourapp-verify.{SUBDOMAIN}', value: ownershipValue(userId), ttl: 300 },
  ];
}
```

Use these same records for the session (step 3), the window (step 4a) and the headless flow (step 4b); `domain.added` then means the CNAME and this user's TXT are both live. Skip the TXT only if your hosting already verifies ownership per customer some other way.

Placeholders: `{DOMAIN}` (the zone, for example `meustudio.com.br`), `{SUBDOMAIN}` (everything left of the zone), `{SLD}` and `{TLD}` (`meustudio` and `com.br`); `@` is the zone apex. Unknown `{…}` tokens are refused, so per-user values are built in your code as above. The zone is the domain's real DNS zone found from its nameservers, so public suffixes like `com.br` and multi-level names work: `agenda.meustudio.com.br` in zone `meustudio.com.br` gives `{SUBDOMAIN}` = `agenda`; `a.b.x.com.br` in zone `x.com.br` gives `a.b`. Types: A, AAAA, CNAME, TXT, MX, CAA. Up to 20 records.

Apex domains (`mybrand.com` itself): DNS does not allow a CNAME there, and Cnamio refuses one with `400` (the connect window sends the user back to the domain field with an "invalid domain" message). If your hosting gives fixed IP addresses, send `A`/`AAAA` records with host `@` for apex domains; otherwise tell users to connect a subdomain such as `links.mybrand.com`, and say so in your UI before they type.

Cnamio only handles DNS. If your hosting also has to know each new hostname (a "custom hostname" or certificate API), call it in your own code: before opening the window, or when the `domain.added` webhook arrives.

### 2. Add the credentials to the server environment

```bash
CNAMIO_APPLICATION_ID=app_…        # not secret, may also be exposed to the browser
CNAMIO_SECRET=cnm_sk_…             # server only: never in client code, never committed
CNAMIO_WEBHOOK_SECRET=…            # from GET /v1/manage/webhook-secret or the dashboard
CNAMIO_OWNERSHIP_KEY=…             # your own random secret for the per-user TXT value (step 1)
```

Add the names (without values) to `.env.example` or the project's equivalent. Do not commit real values.

### 3. Server route that creates a session token

The browser never sees the secret. Your server, after authenticating your user, asks Cnamio for a 60-minute session token.

Node.js (Express):

```js
app.post('/api/cnamio/session', requireUser, async (req, res) => {
  const dnsRecords = dnsRecordsFor(req.user.id);   // step 1, built on the server
  const r = await fetch('https://api.cnamio.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicationId: process.env.CNAMIO_APPLICATION_ID,
      secret: process.env.CNAMIO_SECRET,
      userId: String(req.user.id),           // echoed in jobs and webhooks
      dnsRecords,                            // binds the session to these records
    }),
  });
  if (!r.ok) return res.status(502).json({ error: 'cnamio_unavailable' });
  const { auth_token } = await r.json();
  res.json({ token: auth_token, applicationId: process.env.CNAMIO_APPLICATION_ID, dnsRecords });
});
```

Next.js (App Router, `app/api/cnamio/session/route.ts`):

```ts
export async function POST() {
  const user = await getCurrentUser(); // the project's own auth
  if (!user) return new Response('Unauthorized', { status: 401 });
  const dnsRecords = dnsRecordsFor(user.id); // step 1
  const r = await fetch('https://api.cnamio.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId: process.env.CNAMIO_APPLICATION_ID, secret: process.env.CNAMIO_SECRET, userId: String(user.id), dnsRecords }),
    cache: 'no-store',
  });
  if (!r.ok) return Response.json({ error: 'cnamio_unavailable' }, { status: 502 });
  const { auth_token } = await r.json();
  return Response.json({ token: auth_token, applicationId: process.env.CNAMIO_APPLICATION_ID, dnsRecords });
}
```

Python (FastAPI; `pip install httpx`, FastAPI does not bring it):

```python
import hashlib, hmac, os
import httpx
from fastapi import Depends, HTTPException

def dns_records_for(user_id) -> list[dict]:  # step 1 in Python
    key = os.environ["CNAMIO_OWNERSHIP_KEY"].encode()
    value = "yourapp-verify=" + hmac.new(key, str(user_id).encode(), hashlib.sha256).hexdigest()[:32]
    return [
        {"type": "CNAME", "host": "{SUBDOMAIN}", "value": "customers.yourapp.com", "ttl": 300},
        {"type": "TXT", "host": "_yourapp-verify.{SUBDOMAIN}", "value": value, "ttl": 300},
    ]

@app.post("/api/cnamio/session")
async def cnamio_session(user=Depends(current_user)):
    app_id, secret = os.environ.get("CNAMIO_APPLICATION_ID"), os.environ.get("CNAMIO_SECRET")
    if not app_id or not secret:
        raise HTTPException(503, "custom_domains_not_configured")
    records = dns_records_for(user.id)  # step 1, built on the server
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post("https://api.cnamio.com/token", json={
            "applicationId": app_id, "secret": secret, "userId": str(user.id), "dnsRecords": records,
        })
    if r.status_code != 200:
        raise HTTPException(502, "cnamio_unavailable")
    return {"token": r.json()["auth_token"], "applicationId": app_id, "dnsRecords": records}
```

Optional body fields `domain` and `dnsRecords` bind the session to exactly those values (each can be bound on its own). Binding `dnsRecords` stops a browser from changing the target or the ownership value; the window must then send the identical array (compared exactly, `ttl` included), so return it from the route along with the token, as above. `userId` is optional (any string up to 128 characters); without it, `user_id` is `null` in jobs and webhooks, so send it. Call the route with whatever credentials your app's auth uses (cookies are sent automatically on same-origin `fetch`; add your auth header otherwise). A session lasts 60 minutes: reuse it instead of creating one per click, since `/token` calls from your server share one address and count against the same limit.

### 4a. Browser: open the connect window (recommended for user-facing apps)

Load the SDK once and open the window from the place where users manage their domain:

```html
<script src="https://connect.cnamio.com/sdk/v1.js"></script>
```

```js
async function connectCustomDomain(prefilledDomain) {
  const r = await fetch('/api/cnamio/session', { method: 'POST' });
  if (!r.ok) throw new Error('Custom domains are unavailable right now.'); // show it in your UI
  const { token, applicationId, dnsRecords } = await r.json();
  window.cnamio.connectDomain({
    applicationId,
    token,
    applicationName: 'Your App',          // shown in the window
    locale: 'en',                          // 'en', 'pt-BR' or 'es'
    dnsRecords,                            // exactly the array the session was bound to
    ...(prefilledDomain ? { prefilledDomain } : {}),
  });
}

window.addEventListener('onCnamioSuccess', e => {
  // e.detail: { domain, success: true, setupType: 'automatic' | 'manual', provider, jobId }
  // Automatic: the records were written. Manual: the user says they added the records.
  // Either way propagation is not confirmed yet: store the domain as "pending" with e.detail.jobId.
  // Only the domain.added webhook (step 5) means "connected".
});
window.addEventListener('onCnamioClose', e => { /* e.detail.lastStatus */ });
```

The window runs in an iframe from Cnamio's origin; the token reaches it only through `postMessage`. Options: `forceManualSetup: true` (with `prefilledDomain`) always shows the copy-the-records steps; `primaryColor: '#…'` matches your brand. For single-page apps, also add the script to the page template (not a dynamic import from another host).

### 4b. Headless API flow (agents, CLIs, backends without a UI)

Use the session token on the REST routes, from your server or an agent:

```bash
TOKEN=$(curl -s https://api.cnamio.com/token -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$CNAMIO_APPLICATION_ID\",\"secret\":\"$CNAMIO_SECRET\"}" | jq -r .auth_token)
H=(-H "Authorization: Bearer $TOKEN" -H "applicationId: $CNAMIO_APPLICATION_ID" -H 'Content-Type: application/json')
# The same per-user records as step 1 (here with a fixed example ownership value):
RECORDS='[{"type":"CNAME","host":"{SUBDOMAIN}","value":"customers.yourapp.com","ttl":300},{"type":"TXT","host":"_yourapp-verify.{SUBDOMAIN}","value":"yourapp-verify=<per-user value>","ttl":300}]'

# 1) Where is the DNS? Can it be automatic?  → provider, setupType, connectMethods, recordState
curl -s https://api.cnamio.com/checkdomain "${H[@]}" -d "{\"domain\":\"shop.customer.com\",\"dnsRecords\":$RECORDS,\"checkConflicts\":true}"

# 2a) The user has an API token for that provider (connectMethods contains "api_token"):
curl -s https://api.cnamio.com/connect/automatic "${H[@]}" -d "{\"domain\":\"shop.customer.com\",\"dnsRecords\":$RECORDS,\"providerToken\":\"<user's token>\"}"
# 2b) Otherwise: get the exact records to show the user and start watching propagation:
curl -s https://api.cnamio.com/connect "${H[@]}" -d "{\"domain\":\"shop.customer.com\",\"dnsRecords\":$RECORDS}"

# 3) Follow it (or wait for the webhook):
curl -s https://api.cnamio.com/connect/JOB_ID/status "${H[@]}"
```

Statuses: `pending` → `completed` (connected) or `failed` (72 hours without propagation). `409` means existing records block the connection and nothing was changed: show `conflicts` to the user. `422` means the provider refused the token or automatic setup is not available: fall back to step 2b. A provider token is used once and must not be stored or logged by your code either.

### 5. Webhook endpoint (source of truth)

Cnamio POSTs `domain.added` when every required record is live and `domain.propagation.timeout` after 72 hours without it. Verify the signature over the **raw** body before parsing:

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyCnamio(rawBody, headers, secret) {
  const tsHeader = String(headers['cnamio-timestamp'] ?? '');
  const ts = Number(tsHeader);
  if (!secret || !Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = Buffer.from('sha256=' + createHmac('sha256', secret).update(`${tsHeader}.${rawBody}`).digest('hex'));
  const given = Buffer.from(String(headers['cnamio-signature'] ?? ''));
  return given.length === expected.length && timingSafeEqual(given, expected); // compare byte lengths, then bytes
}

// Express: the raw body is needed for this route only. Register it BEFORE any global
// app.use(express.json()), or the JSON parser consumes the body and every signature fails.
app.post('/webhooks/cnamio', express.raw({ type: 'application/json' }), (req, res) => {
  const raw = req.body.toString('utf8');
  if (!verifyCnamio(raw, req.headers, process.env.CNAMIO_WEBHOOK_SECRET)) return res.sendStatus(401);
  const event = JSON.parse(raw);
  // Idempotent: the same event.id may arrive again (retries after 1, 5 and 30 minutes).
  if (event.type === 'domain.added') markDomainConnected(event.user_id, event.domain, event.job_id);
  if (event.type === 'domain.propagation.timeout') markDomainFailed(event.user_id, event.domain, event.job_id);
  res.sendStatus(200);
});
```

In Next.js, read `await request.text()` for the raw body. In Python (FastAPI), read the raw body and use the timestamp header exactly as received:

```python
import hashlib, hmac, json, os, time
from fastapi import Request, Response

def verify_cnamio(raw: bytes, headers, secret: str | None) -> bool:
    ts = headers.get("cnamio-timestamp", "")
    given = headers.get("cnamio-signature", "")
    if not secret or not ts.isdigit() or abs(time.time() - int(ts)) > 300:
        return False
    expected = "sha256=" + hmac.new(secret.encode(), ts.encode() + b"." + raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected.encode(), given.encode())

@app.post("/webhooks/cnamio")
async def cnamio_webhook(request: Request):
    raw = await request.body()
    secret = os.environ.get("CNAMIO_WEBHOOK_SECRET")
    if not secret:
        return Response(status_code=503)  # misconfigured: Cnamio retries later
    if not verify_cnamio(raw, request.headers, secret):
        return Response(status_code=401)
    event = json.loads(raw)
    # Idempotent by event["id"]; then mark event["user_id"] / event["domain"] connected or failed.
    return Response(status_code=200)
```

Answer `2xx` only after you stored the result. Non-`2xx` answers are retried after 1, 5 and 30 minutes; after the fourth attempt Cnamio stops, and the status stays readable with `GET /connect/{jobId}/status` (or `GET /v1/manage/jobs?domain=`), so a periodic reconciliation of pending domains closes any gap.

After a domain is connected Cnamio keeps monitoring it (read-only DNS checks, included). When its records disappear your webhook receives `domain.records_missing` (`health` is `degraded` or `broken`, `data.records_missing` lists what is gone) and, when they are back, `domain.records_restored`. Handle them if the product should warn the user or stop serving the domain; otherwise ignore them, as any event type you do not handle. The same state is in `health` of `GET /connect/{jobId}/status`.

Payload of `domain.added` / `domain.propagation.timeout` (full schema: `WebhookEvent` in https://cnamio.com/openapi.json):

```json
{
  "id": "6f1c…", "type": "domain.added", "job_id": "job_…", "user_id": "u1",
  "domain": "links.mybrand.com", "subdomain": "links", "provider": "cloudflare",
  "setup_type": "automatic", "propagation_status": "success", "optional_records_propagation_status": "exempt",
  "cname_target": "custom.yourapp.com",
  "data": { "records_propagated": [{ "type": "CNAME", "host": "links.mybrand.com", "value": "custom.yourapp.com" }], "records_non_propagated": [] }
}
```

`webhook.test` carries only `{ id, type: "webhook.test", application_id, created_at }`: answer 200. Events for users or domains you do not know should also get a 200 (and be logged), so they are not retried.

Register the URL (public HTTPS; private and internal addresses are refused; redirects are not followed):

```bash
curl -s -X PUT https://api.cnamio.com/v1/manage/webhook -u "$CNAMIO_APPLICATION_ID:$CNAMIO_SECRET" \
  -H 'Content-Type: application/json' -d '{"url":"https://yourapp.com/webhooks/cnamio"}'
curl -s -u "$CNAMIO_APPLICATION_ID:$CNAMIO_SECRET" https://api.cnamio.com/v1/manage/webhook-secret   # → CNAMIO_WEBHOOK_SECRET
curl -s -X POST -u "$CNAMIO_APPLICATION_ID:$CNAMIO_SECRET" https://api.cnamio.com/v1/manage/webhook-test  # signed webhook.test
```

### 6. Verify the integration

1. `POST /api/cnamio/session` as a signed-in user returns a token (and the secret is absent from every client bundle: search the build output for `cnm_sk_`).
2. `POST /v1/manage/webhook-test` returns `{ "delivered": true }` and your endpoint accepted the signature.
3. `POST /checkdomain` for a real domain returns the provider and `recordState`.
4. Optional end-to-end: connect a test subdomain you own, wait for `domain.added`, then remove the record.

## Use Cnamio from an MCP client

Agents can also use Cnamio directly as tools through the MCP server at `https://api.cnamio.com/mcp` (Streamable HTTP). Without credentials:
`get_integration_guide`, `start_sandbox` (a sandbox session to pass as `sandboxToken` to the domain tools) and `start_signup` (step 0). With credentials:
`check_domain`, `connect_domain`, `connect_domain_automatic`, `get_connection_status`, `recheck_propagation`, `list_connections`, `create_share_link` and
`revoke_share_link`. They behave exactly like the REST routes (same validation, limits and allowed targets).

Add the server with no credentials to start (`claude mcp add --transport http cnamio https://api.cnamio.com/mcp`). MCP clients
that support OAuth (claude.ai and ChatGPT connectors, Claude Code, Cursor) need no header at all: the first domain tool answers 401
with the resource metadata, and the person signs in to Cnamio and approves one application. Otherwise, once the developer has them,
authenticate with the application credentials as HTTP Basic (or a session token as `Bearer` plus an `applicationId` header):

```bash
# Claude Code
claude mcp add --transport http cnamio https://api.cnamio.com/mcp \
  --header "Authorization: Basic $(printf '%s' "$CNAMIO_APPLICATION_ID:$CNAMIO_SECRET" | base64 | tr -d '\n')"
```

```json
{
  "mcpServers": {
    "cnamio": {
      "url": "https://api.cnamio.com/mcp",
      "headers": { "Authorization": "Basic <base64 of applicationId:secret>" }
    }
  }
}
```

Keep this configuration out of version control: it carries the application secret.

## Rules

- The secret stays on the server. The browser and agents running on behalf of end users get session tokens only.
- Never store, log or forward a DNS provider token. Pass it straight to `/connect/automatic`.
- Treat the webhook as the source of truth; the browser event can be lost if the user closes the tab, and in manual setups it only means the user says the records were added.
- Limits: By default 60 requests per minute per address and per session token, under a ceiling of 600 per application. Your server is one address for all of your users, so reuse session tokens and ask for a per-application limit for server-to-server traffic. Errors are `{ "message": "…" }` with a fixed text.
- Content-Security-Policy: allow `script-src https://connect.cnamio.com` and `frame-src https://connect.cnamio.com` on the page that opens the window (and `connect-src https://connect.cnamio.com` if you call `cnamio.checkDomain` from the browser). The SDK at `/sdk/v1.js` is updated in place for fixes, so do not pin it with Subresource Integrity.
- Retrying and changing domains: Cnamio never deletes records. After `failed`, or to switch to another domain, create a new session and connect again (a new `job_id`). To disconnect, stop serving the domain in your app and tell the user they may remove the records.
- Setting or changing the webhook URL (`PUT /v1/manage/webhook`) does not change the webhook secret.
- Do not promise one-click connection to your users: today automatic setup uses a provider API token, and the manual steps are always available.

## Reference

| Route | Auth | Purpose |
| --- | --- | --- |
| `POST /v1/agent/sandbox` | none (no `Origin`) | a 30-minute sandbox session for agents |
| `POST /v1/agent/signup` | none (no `Origin`) | `{ email, consent: true, name?, company?, locale?, client? }`: emails the developer the link that creates their free account |
| `POST /token` | body: applicationId + secret | session token (60 min) |
| `POST /checkdomain` | Bearer + `applicationId` header | provider, setup type, connect methods, record state, conflicts |
| `POST /connect` | Bearer | manual: exact records, starts watching |
| `POST /connect/automatic` | Bearer | creates records with the user's provider token |
| `GET /connect/{jobId}/status` | Bearer | `pending` / `completed` / `failed`, and `health` (`healthy` / `degraded` / `broken`) once connected |
| `POST /connect/propagation/recheck/{jobId}` | Bearer | check now (once per 5 min; `409` when the connection is already finished) |
| `GET /connect/webhooks/last/{jobId}` | Bearer | last webhook and delivery state |
| `GET /v1/manage/jobs?domain=&health=&share_link_id=` | Basic | list connections (with monitoring state) |
| `POST /v1/manage/share-links` | Basic | `{ domains, dnsRecords, maxUses?, expiresInDays?, userId? }`: a link (`url`, shown once) for whoever manages the DNS (agency, IT team); `POST …/{id}/revoke` ends it |
| `PUT /v1/manage/monitoring` | Basic | `{ enabled }`: continuous monitoring on or off |
| `PUT /v1/manage/webhook` · `GET …/webhook-secret` · `POST …/webhook-test` | Basic | webhook setup |
| `GET /v1/manage/usage?month=YYYY-MM` | Basic | usage (each connected domain counts once per month) |

Questions: contato@cnamio.com · Paste-ready block for a project's AGENTS.md: https://cnamio.com/agent-onboarding/AGENTS.md
