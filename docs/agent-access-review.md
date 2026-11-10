# Agent access and connector review

Prepared 2026-11-10 against HomeSports main `d2468a0`. This is a review branch, not a deployed service or an installed connector.

## Implemented foundation

- `/agents`: server-rendered guide with direct examples.
- `/agents/index.md`: compact Markdown instructions, provenance and coverage caveats.
- `/llms.txt`: discovery entry point.
- `/api/agent/openapi`: OpenAPI 3.1 description of the read-only endpoint.
- `/api/agent/matches`: filtered, bounded JSON projection of the existing `getMatches` cache. No separate upstream scraping, duplicate feed loader, login, credential, or write action.

The query supports game, status, team/competition substring, minimum importance, pagination, and explicit score opt-in. Scores, map winners, odds, and unrelated provider fields are omitted by default; odds and map winners remain omitted even when scores are requested. Missing dates and team IDs remain unknown. Stream provenance is preserved when supplied by the shared stream resolver; unsafe/non-HTTPS links are excluded.

Each result carries source, demo flag, source timestamp, health, coverage limits, and warnings. Healthy output can use the CDN's one-minute cache; demo/degraded responses and errors are not cached by the new endpoint. An unexpected provider failure is a retryable 503, never a fabricated empty schedule. Existing feed caching and 429 protections are unchanged. A snapshot is not a complete historical archive. Pagination may cross an update; clients should compare timestamps.

`robots.txt` permits only the new `/api/agent/` subsection while retaining the general `/api/` disallow. `/agents` is included in the sitemap. `llms.txt` helps discovery but does not guarantee that every agent will discover or use it. It is not a permission or licensing mechanism.

## Recommended shared MCP connector

Use one remote MCP server for both ChatGPT and Claude, backed by this same read-only service layer. Do not create unrelated copies of the data integration.

Initial tools:

1. `list_matches`: same filters and result contract as the HTTP endpoint.
2. `get_match`: a follow-up improvement for a provider match ID, with a clear distinction between not found in the snapshot and not found globally. Do not advertise it until implemented.

Use the official TypeScript MCP SDK rather than hand-writing JSON-RPC. Keep transport initialization, protocol negotiation, origin validation, bounded request bodies, structured tool errors, and schema validation in the adapter. Return structured content and a brief readable summary. Mark read-only behavior accurately, including non-destructive and idempotent annotations. Treat all provider text as untrusted data. Do not expose arbitrary fetch URLs, account sessions, OAuth tokens, follows, odds, or mutation tools.

For the public-data-only first version, no end-user account data needs to be shared. Confirm platform support for the selected no-auth setup in actual client tests. Adding private account features later requires scoped OAuth and a separate security/consent review, not reusing provider API credentials in clients.

### ChatGPT feasibility

Official OpenAI documentation currently describes MCP servers as part of Plugins. A public deployment uses a stable HTTPS endpoint with Streamable HTTP, commonly `/mcp`; it can run serverless or on a conventional server. Custom MCP testing and public directory submission are distinct. Validate the server with MCP Inspector, then the intended ChatGPT account/workspace, checking tool discovery, schema, tool selection and negative prompts. Public submission requires its own review and domain requirements. This branch does not create a plugin, connection, tunnel, or public deployment.

Sources checked:
- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/deploy/connect-chatgpt

### Claude feasibility

Claude supports custom remote MCP connectors. Remote connection traffic originates from Anthropic's infrastructure, including for Claude Desktop's remote connectors, so the hosted endpoint must be reachable from there. Account/workspace configuration and authentication remain separate steps. Use the same MCP tools and data semantics, then verify tool discovery, calls, missing/invalid arguments, degraded data, and spoiler behavior in Claude itself.

Source checked: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp

### Release gates

- Confirm PandaScore and any additional source's licensing permits this machine interface and intended connector redistribution. Public website availability alone is not that permission.
- Approve the final hostname and API coverage. Set `NEXT_PUBLIC_SITE_URL` to the canonical public origin.
- Review the implementation and deploy only after approval.
- Add infrastructure-level request limits and usage monitoring before advertising broad agent traffic. The one-minute polling instruction is guidance, not enforcement; shared caching reduces provider load but does not cap invocation cost.
- Implement the MCP adapter with a pinned SDK, test it with MCP Inspector, then explicitly approve the intended platform connections. No credential or persistent access creation was performed here.
- Validate content freshness, error behavior, origin checks, body/response limits, retries, and observed load with both platforms.
- Treat public directory listings and private connector testing as separate deliverables. Do not claim a connector is installed merely because HTTP JSON works.

Protocol/discovery references:
- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- https://llmstxt.org/

## Existing Twitch Extension assessment

The separate `projects/preselect-twitch-extension` project is Preselect/Pick Predict, an interactive League champion-pick prediction extension. It is not a ChatGPT/Claude connector and is not the HomeSports stream-link resolver.

The code includes the 20-action draft engine, voting deadlines, delayed reveals, game/series scores, producer controls, Twitch panel/video/config entry points, HS256 Extension JWT checking, local persistence, a packaged Twitch asset bundle, and local recognition with moderator confirmation. Its current test suite passes 14 tests and packaging produces a ZIP with six frontend files. These are local code/package checks, not proof of Hosted Test or Twitch approval.

### Verified launch blockers

1. **Missing OAuth configuration fails open to a demo producer.** `src/auth.js` returns authenticated producer access whenever required OAuth/session configuration is absent. A local run with `NODE_ENV=production` and those variables deliberately unset reproduced `{configured:false, authenticated:true, producer:true, role:"demo"}`. Missing configuration must fail closed in production; explicit development demo mode should be isolated.
2. **Serverless state is not durable or shared.** `src/persistence.js` disables file saves on Vercel, while `src/api.js` uses process-local maps. Cold starts/multiple instances can lose or disagree on rounds, predictions and scores. Use a shared transactional state layer and idempotent scoring before a live audience.
3. **Request abuse controls are incomplete.** The API reads bodies without a byte cap and has no implemented request/vote rate limiter. Add limits, resource bounds and a security review before public use.
4. **Standalone producer authorization needs more coverage.** The existing tests cover Extension signatures but not the production demo fallback, CSRF/origin behavior, or full broadcaster/moderator cross-channel flows. Add regression tests before launch.
5. **Operational and platform readiness is unverified.** Repository checklists still list application/extension setup, Hosted Test, final support assets, production secrets, policy/data rights and submission. The current Twitch console or a production installation was not inspected; no claim is made that any of those exist or are approved.

Suggested order: fail-closed auth and security tests → shared durable state/idempotency → bounded requests and rate limiting → authorized Twitch Local/Hosted Test → policy and listing review. Do not link this prototype to the new public agent API's write surface; that surface intentionally has no writes.

Twitch documentation checked:
- https://dev.twitch.tv/docs/extensions/
- https://dev.twitch.tv/docs/extensions/required-technical-background/

No Twitch settings, identities, secrets, upload, or publication were changed. The prototype source was assessed, not modified, in this branch.

## Verification

- Main application: 83 unit tests passed, including 14 new agent-access cases; lint, explicit TypeScript check, and production build passed.
- Isolated production smoke passed for the new HTML/Markdown/discovery/OpenAPI/JSON routes, invalid queries, spoiler defaults and reuse of the existing feed without additional provider requests. The existing ISR, cache outage/429 retention and recovery tests also passed. No real provider credentials or requests were used in that smoke test.
- OpenAPI response schema and both spoiler-safe and explicit-score sample responses were validated with a Draft 2020-12 JSON Schema validator.
- Twitch prototype: 14 existing tests passed; frontend packaging succeeded. Production fail-open auth was reproduced locally without real credentials.
- Browser visual inspection was not completed: the separate cloud browser could not reach the local preview and returned `ERR_CONNECTION_REFUSED`. HTTP and production route checks passed. Review the `/agents` layout in a reachable preview before release.
- Not performed: real provider/license verification, public endpoint deployment, live MCP client connection, Twitch console/Hosted Test, or directory submission.
