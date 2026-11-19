<!-- Paste this block into your project's AGENTS.md (or CLAUDE.md, .cursor/rules, .github/copilot-instructions.md). Source: https://cnamio.com/agent-onboarding/AGENTS.md -->

## Custom domains (Cnamio)

This project lets its users connect their own domain with Cnamio (https://cnamio.com). When you work on custom domains:

- Follow https://cnamio.com/agent-onboarding/SKILL.md. Docs for agents: https://cnamio.com/llms.txt (everything in one file: https://cnamio.com/llms-full.txt). Framework recipes: https://cnamio.com/recipes/nextjs.md, express.md, rails.md, laravel.md, django.md.
- Use the server SDK (the single file https://cnamio.com/sdk/cnamio.mjs or https://cnamio.com/sdk/cnamio.py saved into the project; there is no package to install yet) or the REST API at https://api.cnamio.com. MCP server: https://api.cnamio.com/mcp.
- Credentials live in the server environment only: `CNAMIO_APPLICATION_ID`, `CNAMIO_SECRET` (never in client code, never committed, never pasted in chat), `CNAMIO_OWNERSHIP_KEY`, `CNAMIO_WEBHOOK_SECRET`. Never invent them.
- No credentials yet: run against the sandbox (MCP `start_sandbox`, or `POST https://api.cnamio.com/v1/agent/sandbox`), and offer to start a free account for the developer (MCP `start_signup` or `POST https://api.cnamio.com/v1/agent/signup`, with their email and their agreement to the Terms and Privacy Policy). The account exists only after they open the emailed link. They can also sign up themselves at https://cnamio.com/?utm_source=agents-md&utm_medium=agent#start.
- Build DNS records per user with `recordsForUser` / `records_for_user` (a CNAME plus an ownership TXT), bind them to the session, and send the same array to the connect window.
- The `domain.added` webhook, verified over the raw body with `CNAMIO_WEBHOOK_SECRET`, is the only signal that a domain is connected. Handle events idempotently by `id`.
- Cnamio never deletes or overwrites existing DNS records. Never ask for, store or log a DNS provider password; a provider API token is passed straight to `connect_automatic` and used once.
- Test with the test application (sandbox provider): `shop.example.com` connects, `conflict.example.com` conflicts, `pending.example.com` never propagates.
