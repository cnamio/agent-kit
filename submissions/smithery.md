# Smithery

**Status (checked 2026-11-19): Smithery does not take new publications.** Arcade.dev acquired it on 2026-08-05;
https://smithery.ai/future says it stays a public, non-proxied registry, and accounts, API keys and the CLI publish
flow stopped on 2026-10-31 (`smithery.ai/new` answers 404). The only contact given is ani@smithery.ai.

What is ready on our side anyway, because other registries read the same convention (SEP-1649):

- `https://api.cnamio.com/.well-known/mcp/server-card.json`: the static server card (`serverInfo`, `authentication`,
  `tools`, `resources`, `prompts`), generated from the same tool definitions as `tools/list`. Snapshot of what
  production serves: [`smithery/server-card.json`](smithery/server-card.json).
- The scanner (`SmitheryBot/1.0 (+https://smithery.ai)`, from Cloudflare Workers) is counted as a directory, never as a
  lead, and is not held back by our limits (a full scan is a handful of requests; the per-address budget is 60 a minute).

Fields for a submission, if the flow reopens (the last documented flow asked for the URL; name, description, icon
and homepage came from the scan or the card):

| Field | Value |
| --- | --- |
| Namespace / server | `cnamio/domains` |
| Server URL | `https://api.cnamio.com/mcp?utm_source=smithery` |
| Display name | Cnamio |
| Description | Custom domains for your users: finds the DNS provider, creates the records with a provider token or returns the exact records to copy, confirms propagation and sends a signed webhook. Free sign-up; a sandbox needs no account. |
| Homepage | `https://cnamio.com/agents?utm_source=smithery&utm_medium=agent` |
| Icon | `https://cnamio.com/brand/cnamio-app-icon.svg` |
| Authentication | optional; HTTP Basic `applicationId:secret` for the domain tools |
