# Context7

Anyone can add a library at https://context7.com/add-library; the GitHub tab takes only the repository URL (the
repository must be public). The API behind it also takes a website, an `llms.txt` or an OpenAPI URL.

| Field | Value |
| --- | --- |
| GitHub repository | `https://github.com/cnamio/agent-kit` (after it is public; `context7.json` at its root sets the title, description, folders and rules) |
| Or llms.txt | `https://cnamio.com/llms.txt` |
| Or OpenAPI | `https://cnamio.com/openapi.json` |

Claim it afterwards (admin panel, more versions, faster refresh): open `https://context7.com/cnamio/agent-kit/admin`,
**Claim to manage**, copy the `{ "url": …, "public_key": "pk_…" }` it shows into `context7.json` at the repository root
(default branch), then **Claim Library**. Context7 refuses slogans, promotion and instructions aimed at agents in
`projectTitle`, `description` and `rules`, and indexes English only: keep `context7.json` factual.

Agents reach the docs through Context7 without a link of ours, so this channel is measured by the `context7` user agent
on our docs (counted as a directory) rather than by `utm_source`.
