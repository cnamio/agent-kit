# Claude: plugin directory (and the connector it uses)

Portal: https://claude.ai/directory/manage → **Submit new**. Needs a paid Claude plan (Pro, Max or Ultra from the
owner's account; on Team or Enterprise, an Owner), and the GitHub account connected on claude.ai with push access to
the repository. The repository may be private during review (Claude GitHub App) but must be public before the listing
goes live. Before submitting: `claude plugin validate . --strict` (and `--profile directory`) at the repository root.

## Plugin bundle

| Step | What to enter |
| --- | --- |
| Source | Repository `cnamio/agent-kit`; plugin path: empty (the plugin is the repository root); branch `main` → **Validate** |
| Listing details | Read from `.claude-plugin/plugin.json` and `README.md` (not editable in the portal) |
| Data handling | Reads or stores personal data: only the developer's email (and optional name and company) when they ask for an account through `start_signup`, after agreeing to the Terms and Privacy Policy. Sends data elsewhere: no; it talks only to its own MCP server, `https://api.cnamio.com/mcp`. Retention: as in https://cnamio.com/privacy. Meant for people under 18: no |
| Compliance | Contact email `contato@cnamio.com`, and the four acknowledgements |
| Review and submit | New versions: GitHub push webhook. Auto-publish: off until the first review is through |

Checks the portal enforces, already met: README with more than 40 words, `LICENSE` (MIT) and `license`, the remote MCP
server with `type: "http"` and an `https://` URL, no secret in MCP headers (there are none), no unpinned launcher, no
`.DS_Store`/`Thumbs.db`, lowercase ASCII name. The README documents every data flow (the security scan looks for
undisclosed ones). Snippets for authenticated use show placeholders, not credentials read from the environment (that
pattern sends a version to manual review).

## Connector (the same MCP server, submitted on its own)

The plugin points at a remote MCP server, so the server must also be submitted as a connector, at the same URL:

| Step | What to enter |
| --- | --- |
| Connection | `https://api.cnamio.com/mcp?utm_source=claude-plugin` |
| Tools | Synced from the server; every tool has `title` and `readOnlyHint`/`destructiveHint` |
| Listing | Name: `Cnamio` · One-liner (≤200): `Custom domains for your users: detect the DNS provider, create the records, confirm propagation.` · Description (≤2000): the paragraph "What Cnamio does" of README.md · Categories: Developer tools · Docs: `https://cnamio.com/agents` · Privacy: `https://cnamio.com/privacy` · Support: `contato@cnamio.com` · Icon: `https://cnamio.com/brand/cnamio-app-icon.svg` · Slug (permanent): `cnamio` |
| Use cases | Add custom domains to a codebase; check a domain's DNS; connect a domain and follow its propagation. Users need nothing to start (sandbox); a free Cnamio account for their own domains. Reads and writes |
| Company | Cnamio · `https://cnamio.com` · the owner as primary contact |
| Authentication | "Required when the server asks" (anonymous tools work without credentials). The domain tools use HTTP Basic today, which the directory does not accept: until OAuth exists on the server, only the anonymous tools work from claude.ai |
| Data handling | Our own API; no health data; no sponsored content |
| Test & launch | Run every tool once (sandbox: `start_sandbox`, then the domain tools with `sandboxToken`) |
| Compliance | The seven acknowledgements |

Install command to put in the listing and the README: `/plugin marketplace add cnamio/agent-kit` then
`/plugin install cnamio@cnamio`.
