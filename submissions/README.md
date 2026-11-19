# Directory submissions: prepared content

Everything here is ready to paste; nothing has been submitted. Each submission is made by the owner from the account
named below (they accept each site's terms). Formats were checked against the upstream documentation on 2026-11-19;
the sources are listed at the end.

## Channels, attribution and next step

Each listing points at its own URL, so a sign-up or a sandbox session that starts there is counted for it. The MCP
server reads `utm_source` from its own URL (`/mcp?utm_source=…`, a closed list of channels; nothing else is kept), and
links to cnamio.com carry `utm_source=<channel>&utm_medium=agent`.

| Channel | `utm_source` | File | Who, which account | Next step |
| --- | --- | --- | --- | --- |
| Official MCP Registry | `mcp-registry` | `docs/mcp/server.json` (engine) | Owner, `mcp-publisher` with the `com.cnamio` HTTP key | Publish version 1.1.1 after the deploy |
| GitHub MCP Registry / VS Code | (registry URL) | — | Owner's email | After the registry update and this repo is public: email partnerships@github.com asking to include `com.cnamio/domains` |
| Claude plugin + connector | `claude-plugin` | [claude-plugin.md](claude-plugin.md), `.claude-plugin/`, `.mcp.json` | Owner, paid Claude plan with GitHub connected | `claude plugin validate . --strict`, then claude.ai/directory/manage → Submit new (plugin bundle, then the connector) |
| skills.sh | `skill` | `skills/cnamio/SKILL.md` | Nobody: listing follows installs | Make the repo public; check `npx skills add cnamio/agent-kit` |
| Context7 | (user agent `context7`) | [context7.md](context7.md), `context7.json` | Anyone; claiming needs the owner's GitHub | context7.com/add-library with the repo URL; then claim |
| Glama | `glama` | [glama.md](glama.md), `glama.json` | Owner, Glama login with GitHub `geelio` | Copy the claim token into `CNAMIO_GLAMA_CLAIM` (connector); claim the repo after it is public |
| Docker MCP Catalog | `docker` | [docker/servers/cnamio/](docker/servers/cnamio/) | Owner, GitHub account (PR to docker/mcp-registry) | Fork, copy `servers/cnamio/`, `task catalog -- cnamio` and `docker mcp catalog import $PWD/catalogs/cnamio/catalog.yaml` to try it, open the PR; send test credentials through Docker's form |
| awesome-remote-mcp-servers | `awesome-remote` | [awesome-remote-mcp-servers.md](awesome-remote-mcp-servers.md) | Owner, GitHub account | PR adding the row |
| mcp.so | `mcp-so` | [mcp-so.md](mcp-so.md) | Owner, GitHub account (free issue) or mcp.so login (paid, US$39) | Open the issue; the paid form is a spending decision |
| Smithery | `smithery` | [smithery.md](smithery.md), [smithery/server-card.json](smithery/server-card.json) | — | Closed to new publications since 2026-10-31; the server card is served anyway |
| PulseMCP | `pulsemcp` | — | — | Submissions paused; it ingests the official registry |
| This kit's README and examples | `agent-kit` | `README.md`, `examples/*` | — | — |
| AGENTS.md block | `agents-md` | `snippets/AGENTS.md` | — | — |

Directory scanners (SmitheryBot, Glama, PulseMCP, mcp.so, Context7) are counted as "directory" in Cnamio's own report,
apart from agents at work and never as leads, and our limits leave room for their scans.

## Sources of the formats

- Smithery: shutdown notice https://smithery.ai/future · acquisition https://arcade.dev/blog/smithery-joins-arcade ·
  server card and scanner (last published docs, via the Wayback Machine) https://smithery.ai/docs/build/publish ·
  card proposal SEP-1649 https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1649 · CLI
  https://github.com/arcadeai-labs/smithery-cli
- Glama: https://glama.ai/blog/2025-07-08-what-is-glamajson · https://glama.ai/mcp/schemas/server.json ·
  https://glama.ai/mcp/schemas/connector.json · listing https://glama.ai/mcp/connectors/com.cnamio/domains
- Docker MCP Catalog: https://github.com/docker/mcp-registry/blob/main/CONTRIBUTING.md · header-auth example
  https://github.com/docker/mcp-registry/blob/main/servers/mercado-pago/server.yaml · schema
  https://github.com/docker/mcp-registry/blob/main/pkg/servers/types.go · test credentials https://forms.gle/6Lw3nsvu2d6nFg8e6
- awesome-remote-mcp-servers: https://github.com/jaw9c/awesome-remote-mcp-servers (README table and CONTRIBUTING.md)
- mcp.so: https://mcp.so/submit · https://github.com/chatmcp/mcpso/issues
- Claude Code plugins: https://code.claude.com/docs/en/plugins-reference ·
  https://code.claude.com/docs/en/plugins/marketplace-reference.md · https://code.claude.com/docs/en/mcp ·
  submission https://claude.com/docs/plugins/submit · https://claude.com/docs/plugins/pre-submission-checklist ·
  connector https://claude.com/docs/connectors/building/submission.md
- Agent Skills and skills.sh: https://agentskills.io/specification · https://github.com/vercel-labs/skills · https://skills.sh/docs
- Context7: https://context7.com/docs/adding-libraries.md · https://context7.com/docs/howto/claiming-libraries.md ·
  schema https://context7.com/schema/context7.json
- Client configuration: Cursor https://cursor.com/docs/context/mcp and https://cursor.com/docs/context/mcp/install-links ·
  Codex https://developers.openai.com/codex/mcp · VS Code https://code.visualstudio.com/docs/agents/reference/mcp-configuration ·
  Devin Desktop / Windsurf https://docs.devin.ai/cli/extensibility/mcp/configuration.md and
  https://docs.devin.ai/windsurf/plugins/cascade/mcp.md
- GitHub MCP Registry: https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/
