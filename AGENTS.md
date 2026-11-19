# Working on this repository

This is Cnamio's public kit for coding agents: content and examples only. The Cnamio service itself is not here.

- Never commit a secret, a `.env` file or a real-looking credential. Examples read `CNAMIO_APPLICATION_ID`,
  `CNAMIO_SECRET`, `CNAMIO_OWNERSHIP_KEY` and `CNAMIO_WEBHOOK_SECRET` from the environment and run on the sandbox
  without them.
- `skills/cnamio/SKILL.md`, `snippets/AGENTS.md` and `submissions/smithery/server-card.json` are generated from the
  documents Cnamio serves (https://cnamio.com/agent-onboarding/SKILL.md, https://cnamio.com/agent-onboarding/AGENTS.md,
  https://api.cnamio.com/.well-known/mcp/server-card.json). Change them at the source, not here.
- There is no `cnamio` package on npm or PyPI yet: never tell anyone to install one. The examples download the
  single-file SDK from https://cnamio.com/sdk/.
- Links to cnamio.com and the MCP URLs carry `utm_source=<channel>` (see `submissions/README.md`); keep the channel of
  the file you edit.
- Before a change: `npm test` in `examples/express` and `examples/nextjs`, `pytest` in `examples/fastapi`.
