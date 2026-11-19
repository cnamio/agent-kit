# awesome-remote-mcp-servers (jaw9c/awesome-remote-mcp-servers)

Row for the table under "## Remote MCP Server List" (keep the alphabetical position, between the C entries):

```markdown
| Cnamio | Software Development | `https://api.cnamio.com/mcp?utm_source=awesome-remote` | Open / API Key | [Cnamio](https://cnamio.com/?utm_source=awesome-remote&utm_medium=agent) |
```

PR title: `Add Cnamio (custom domains for SaaS users)`

PR body (CONTRIBUTING asks for quality criteria, production use, notable features, links, maintenance and support):

```markdown
Adds Cnamio, a remote MCP server (Streamable HTTP) that connects a SaaS's end-user custom domains:
it finds the domain's DNS provider, creates the records with a provider API token or returns the exact
records to copy, confirms propagation on the authoritative nameservers and sends a signed webhook.

- Production: https://api.cnamio.com/mcp, listed in the official MCP Registry as `com.cnamio/domains`.
- Authentication: open for the integration guide, a sandbox session (`start_sandbox`) and the free sign-up
  (`start_signup`, email-verified); HTTP Basic with the application's id and secret for the domain tools.
- Every tool has a title and readOnlyHint/destructiveHint; existing DNS records are never changed or deleted.
- Docs for agents: https://cnamio.com/agents, https://cnamio.com/llms.txt; security: https://cnamio.com/security
- Public kit (skill, plugin, examples): https://github.com/cnamio/agent-kit · Support: contato@cnamio.com
```
