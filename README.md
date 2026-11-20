<a href="https://cnamio.com"><img src="https://cnamio.com/brand/cnamio-app-icon-128.png" alt="Cnamio" width="64" height="64"></a>

# Cnamio agent kit

Everything a coding agent needs to add **"connect your own domain"** to a SaaS with [Cnamio](https://cnamio.com/?utm_source=agent-kit&utm_medium=agent):
an integration skill, a Claude Code plugin, MCP configuration for the common agents, a paste-ready `AGENTS.md` block
and three runnable examples (Next.js, Express, FastAPI) that work without an account.

**What Cnamio does.** Your user types their domain (`shop.customer.com`). Cnamio finds where its DNS is hosted, creates
the records your app needs with an API token the user gives (used once, never stored) or returns the exact records to
copy, confirms them on the domain's authoritative nameservers and sends your backend a signed `domain.added` webhook.
Existing DNS records are never changed or deleted. Cnamio handles DNS only: your hosting serves the domain and its
certificate.

**No account needed to start.** `POST https://api.cnamio.com/v1/agent/sandbox` (or the MCP tool `start_sandbox`)
returns a 30-minute session of a test application: any domain connects, nothing real is touched. The free account is
created by email, by the developer or by their agent (`start_signup`, with the developer's email and their agreement
to the [Terms](https://cnamio.com/terms) and [Privacy Policy](https://cnamio.com/privacy)), at
https://cnamio.com/?utm_source=agent-kit&utm_medium=agent#start.

The one-line prompt:

```text
Add custom domains for my users with Cnamio: read and follow https://cnamio.com/agent-onboarding/SKILL.md. If I don't have a Cnamio account yet, start in the sandbox right away and ask me before signing me up for a free account with my email.
```

## Three ways to use Cnamio from an agent

### 1. The remote MCP server

`https://api.cnamio.com/mcp` (Streamable HTTP), listed in the official MCP Registry as `com.cnamio/domains`.
Without credentials: `get_integration_guide`, `start_sandbox`, `start_signup`, and the domain tools with a
`sandboxToken`. With the application's credentials (HTTP Basic `applicationId:secret`): `check_domain`,
`connect_domain`, `connect_domain_automatic`, `get_connection_status`, `recheck_propagation`, `list_connections`,
`create_share_link`, `revoke_share_link`.

Start without credentials (every snippet below works as is). Add the `Authorization` header only once the developer has
an application, and keep that configuration out of version control: it carries the secret.

**Claude Code**: the plugin in this repository (skill plus MCP server):

```text
/plugin marketplace add cnamio/agent-kit
/plugin install cnamio@cnamio
```

or the server alone:

```bash
claude mcp add --transport http cnamio "https://api.cnamio.com/mcp?utm_source=agent-kit"
# with credentials:
claude mcp add --transport http cnamio "https://api.cnamio.com/mcp?utm_source=agent-kit" --header "Authorization: Basic <base64 of applicationId:secret>"
```

**Cursor** (`~/.cursor/mcp.json` or `.cursor/mcp.json`), or
[add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=cnamio&config=eyJ1cmwiOiJodHRwczovL2FwaS5jbmFtaW8uY29tL21jcD91dG1fc291cmNlPWFnZW50LWtpdCJ9):

```json
{
  "mcpServers": {
    "cnamio": {
      "url": "https://api.cnamio.com/mcp?utm_source=agent-kit"
    }
  }
}
```

With credentials, add `"headers": { "Authorization": "Basic <base64 of applicationId:secret>" }`.

**OpenAI Codex** (`~/.codex/config.toml`, or `codex mcp add cnamio --url "https://api.cnamio.com/mcp?utm_source=agent-kit"`):

```toml
[mcp_servers.cnamio]
url = "https://api.cnamio.com/mcp?utm_source=agent-kit"
# with credentials, the full header value ("Basic <base64>") in an environment variable of yours:
# env_http_headers = { "Authorization" = "CNAMIO_AUTHORIZATION" }
```

**VS Code / GitHub Copilot** (`.vscode/mcp.json`; the password prompt keeps the secret out of the file):

```json
{
  "inputs": [
    { "type": "promptString", "id": "cnamio-auth", "description": "Cnamio Authorization header (Basic <base64 of applicationId:secret>), empty for the sandbox", "password": true }
  ],
  "servers": {
    "cnamio": {
      "type": "http",
      "url": "https://api.cnamio.com/mcp?utm_source=agent-kit",
      "headers": { "Authorization": "${input:cnamio-auth}" }
    }
  }
}
```

**Windsurf / Devin Desktop** (`~/.config/devin/mcp_config.json`; older Windsurf: `~/.codeium/windsurf/mcp_config.json` with `serverUrl`):

```json
{
  "mcpServers": {
    "cnamio": {
      "url": "https://api.cnamio.com/mcp?utm_source=agent-kit",
      "transport": "http"
    }
  }
}
```

An empty `Authorization` header (or `Basic` with nothing after it) is treated as no credentials.

### 2. The REST API

Base `https://api.cnamio.com`. Your server exchanges the application id and secret for a 60-minute session token
(`POST /token`) and calls `POST /checkdomain`, `POST /connect` (records to copy), `POST /connect/automatic` (with the
user's provider token) and `GET /connect/{jobId}/status`; the management API (`/v1/manage/…`, HTTP Basic) sets the
webhook. Everything is in the [OpenAPI 3.1 file](https://cnamio.com/openapi.json) and the
[docs](https://cnamio.com/docs.md); agents can read [llms.txt](https://cnamio.com/llms.txt) or the whole documentation
in [one file](https://cnamio.com/llms-full.txt).

```bash
curl -s -X POST https://api.cnamio.com/v1/agent/sandbox    # a sandbox session: no account, nothing real touched
```

### 3. The server SDK (one file)

One file, no dependencies, for Node.js 18+ and Python 3.9+. There is no package to install yet: save the file into the
project and commit it.

```bash
curl -fsS https://cnamio.com/sdk/cnamio.mjs -o lib/cnamio.mjs && curl -fsS https://cnamio.com/sdk/cnamio.d.mts -o lib/cnamio.d.mts
curl -fsS https://cnamio.com/sdk/cnamio.py -o app/cnamio.py
```

```js
import { Cnamio, recordsForUser, verifyWebhook } from './lib/cnamio.mjs';
const cnamio = new Cnamio(); // reads CNAMIO_APPLICATION_ID and CNAMIO_SECRET
const records = recordsForUser({ target: 'customers.yourapp.com', userId, ownershipKey: process.env.CNAMIO_OWNERSHIP_KEY });
const check = await cnamio.checkDomain('shop.customer.com', records);
const job = await cnamio.connect('shop.customer.com', records, { userId });
```

## What is in this repository

| Path | What it is |
| --- | --- |
| [`skills/cnamio/SKILL.md`](skills/cnamio/SKILL.md) | The integration skill ([Agent Skills](https://agentskills.io) format). `npx skills add cnamio/agent-kit` installs it for Claude Code, Cursor, Codex and others |
| [`claude-plugin/`](claude-plugin/) | The Claude Code plugin (the skill plus the MCP server), the folder submitted to the Claude plugin directory |
| [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json), [`.mcp.json`](.mcp.json) | The marketplace that lists the plugin, and a project MCP configuration for this repository |
| [`snippets/AGENTS.md`](snippets/AGENTS.md) | A block to paste into a project's `AGENTS.md`, `CLAUDE.md` or editor rules |
| [`examples/nextjs`](examples/nextjs), [`examples/express`](examples/express), [`examples/fastapi`](examples/fastapi) | "Add custom domains to my SaaS": `npm run dev` (or `uvicorn`) runs on the sandbox without an account, then real credentials via the environment. Each has tests and a smoke script |
| `context7.json`, `glama.json` | Listing metadata for Context7 and Glama |
| [`submissions/`](submissions/) | The exact content prepared for each directory, with the sources of their formats |

## What the plugin and the examples send, and where

- The MCP server and the examples talk only to `https://api.cnamio.com` (and download the SDK file from
  `https://cnamio.com/sdk/`). The MCP URLs carry `?utm_source=<channel>` so Cnamio can count, per day and in
  aggregate, which listing an agent came from; no address, user agent or email is kept with that count.
- What reaches Cnamio is what a connection needs: the domain, the DNS records, your own user id (echoed back in jobs
  and webhooks), and, for automatic setup, the user's DNS provider token, used for that one call and never stored.
- `start_signup` sends the developer's email (and optionally their name and company) only after they agreed to the
  Terms and the Privacy Policy; the account exists only once they open the emailed link.
- The sandbox reads and writes no real DNS. Data handling: https://cnamio.com/security and https://cnamio.com/privacy.

## Rules for agents

- The secret stays on the server: never in client code, never committed, never pasted into a chat. Never invent it.
- Never ask for, store or log a DNS provider password; a provider API token goes straight to `connect_automatic`.
- The `domain.added` webhook, verified over the raw body, is the only signal that a domain is connected.
- Cnamio never deletes or overwrites existing DNS records; a conflict comes back as `409` with the reasons.

Questions: contato@cnamio.com. MIT license.
