# Cnamio plugin for Claude Code

Adds **"connect your own domain"** to a SaaS with [Cnamio](https://cnamio.com/?utm_source=claude-plugin&utm_medium=agent).
The plugin bundles two things:

- **The `cnamio` skill**: how to integrate Cnamio into a codebase (environment variables, the server session route,
  the browser connect window, a headless API flow and webhook verification), loaded when a project needs end users to
  point a custom domain at the app.
- **The Cnamio remote MCP server** (`https://api.cnamio.com/mcp`, Streamable HTTP): tools to detect a domain's DNS
  provider, create or list the records, confirm propagation and follow a connection.

**What Cnamio does.** Your user types their domain (`shop.customer.com`). Cnamio finds where its DNS is hosted, creates
the records your app needs with an API token the user gives (used once, never stored) or returns the exact records to
copy, confirms them on the domain's authoritative nameservers and sends your backend a signed `domain.added` webhook.
Existing DNS records are never changed or deleted. Cnamio handles DNS only: your hosting serves the domain and its
certificate.

## Install

```text
/plugin marketplace add cnamio/agent-kit
/plugin install cnamio@cnamio
```

## Start without an account

The MCP tool `start_sandbox` returns a 30-minute session of a test application: any domain connects and nothing real
is touched, so the agent can build and test the integration right away. The free account is created by email, by the
developer at https://cnamio.com/?utm_source=claude-plugin&utm_medium=agent#start or by the agent with `start_signup`,
only with the developer's email and their agreement to the [Terms](https://cnamio.com/terms) and
[Privacy Policy](https://cnamio.com/privacy).

## Tools

Without credentials: `get_integration_guide`, `start_sandbox`, `start_signup`, and the domain tools with a
`sandboxToken`. Signed in to a Cnamio application (OAuth when the server asks): `check_domain`, `connect_domain`,
`connect_domain_automatic`, `get_connection_status`, `recheck_propagation`, `list_connections`, `create_share_link`,
`revoke_share_link`.

## Server SDKs

The skill can use the official server SDKs, with no dependencies: [`cnamio` on npm](https://www.npmjs.com/package/cnamio)
(Node.js 18+) and [`cnamio` on PyPI](https://pypi.org/project/cnamio/) (Python 3.9+). See each package page for
installation. Full documentation: https://cnamio.com/docs and the [OpenAPI file](https://cnamio.com/openapi.json).

## What the plugin sends, and where

- The plugin talks only to its own MCP server, `https://api.cnamio.com/mcp`. The URL carries `?utm_source=claude-plugin`
  so Cnamio can count, per day and in aggregate, how many agents came from this plugin; no address, user agent or
  email is kept with that count.
- What reaches Cnamio is what a connection needs: the domain, the DNS records, your own user id (echoed back in jobs
  and webhooks), and, for automatic setup, the user's DNS provider token, used for that one call and never stored.
- `start_signup` sends the developer's email (and optionally their name and company) only after they agreed to the
  Terms and the Privacy Policy; the account exists only once they open the emailed link.
- The sandbox reads and writes no real DNS. The plugin reads no file or credential from your machine.
  Data handling: https://cnamio.com/security and https://cnamio.com/privacy.

## Rules the skill follows

- The application secret stays on the server: never in client code, never committed, never pasted into a chat. It is
  never invented.
- A DNS provider password is never asked for, stored or logged; a provider API token goes straight to the automatic
  connection call.
- The `domain.added` webhook, verified over the raw body, is the only signal that a domain is connected.
- Cnamio never deletes or overwrites existing DNS records; a conflict comes back as `409` with the reasons.

Questions: contato@cnamio.com. Support: https://cnamio.com/agents. MIT license.
