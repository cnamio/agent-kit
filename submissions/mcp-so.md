# mcp.so

Two ways in. The web form at https://mcp.so/submit?type=remote-server asks only for **Endpoint URL** and **Name** and,
for remote servers, offers only the paid listing (US$39 one-time): that is spending, so it is the owner's call.
The free way is an issue in https://github.com/chatmcp/mcpso (no template; recent issues follow the shape below, and
many are not acted on).

## Web form (paid)

- Endpoint URL: `https://api.cnamio.com/mcp?utm_source=mcp-so`
- Name: `Cnamio`

## GitHub issue (free)

Title: `Submit Remote MCP Server: Cnamio (com.cnamio/domains)`

```markdown
- Name: Cnamio
- Type: Remote MCP server (Streamable HTTP)
- Server URL: https://api.cnamio.com/mcp?utm_source=mcp-so
- Auth: optional. Open: get_integration_guide, start_sandbox, start_signup. HTTP Basic (applicationId:secret) for the domain tools.
- Homepage: https://cnamio.com/?utm_source=mcp-so&utm_medium=agent
- Docs: https://cnamio.com/agents?utm_source=mcp-so&utm_medium=agent · https://cnamio.com/llms.txt
- Repository (public kit: skill, plugin, examples): https://github.com/cnamio/agent-kit
- Official MCP Registry: com.cnamio/domains
- Support: contato@cnamio.com
- Category: Developer Tools
- Tags: dns, custom-domains, saas, cname, webhooks
- Tagline: Custom domains for your users: detect the DNS provider, create the records, confirm propagation.
- Description: Cnamio connects a SaaS's end-user custom domains (shop.customer.com). It finds where the domain's DNS
  is hosted, creates the needed records with an API token the user gives (used once, never stored) or returns the exact
  records to copy, confirms them on the authoritative nameservers and sends a signed webhook. Existing DNS records are
  never changed or deleted. A sandbox session works without an account; the free account is created by email.
- Example prompts:
  - "Add custom domains for my users with Cnamio; start in the sandbox."
  - "Check where links.mybrand.com's DNS is hosted and what records it needs."
  - "Send the agency a link to connect shop.customer.com without our secret."
- Tools: get_integration_guide, start_sandbox, start_signup, check_domain, connect_domain, connect_domain_automatic,
  get_connection_status, recheck_propagation, list_connections, create_share_link, revoke_share_link
```
