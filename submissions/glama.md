# Glama

Cnamio is already listed, unclaimed, at https://glama.ai/mcp/connectors/com.cnamio/domains (read from the official MCP
Registry). Two separate claims:

1. **The connector listing** (`com.cnamio/domains`). Glama checks `/.well-known/glama.json` on `api.cnamio.com` (host
   scope) or `cnamio.com` (registry namespace scope), or a DNS TXT at `_glama-claim.api.cnamio.com` /
   `_glama-claim.cnamio.com`. The connector schema (https://glama.ai/mcp/schemas/connector.json) takes a `claim` token
   copied from Glama's claim panel; its `maintainers` (objects with an email) are deprecated, and GitHub usernames are
   not accepted there. So: sign in to Glama with the GitHub account `geelio`, open the claim panel of the listing, copy
   the `glama_claim_…` token, set `CNAMIO_GLAMA_CLAIM=<token>` on the Cnamio service and restart. Our server then
   serves `{"$schema": "https://glama.ai/mcp/schemas/connector.json", "claim": ["glama_claim_…"]}` on both hosts.
   Keep it published: Glama re-checks and gives 7 days of grace if the file disappears.
2. **This repository**, once public: `glama.json` at the root (`"maintainers": ["geelio"]`, the server schema), then
   run Glama's claim flow for the repository.
