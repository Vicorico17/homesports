# GRID coverage / Premium implementation plan

Review: 2026-11-15. Premium is a FREE presentation category, per Victor’s explicit clarification. No subscriptions, prices or paywalls. Local routes are prepared, not yet published.

## Product direction

GRID-covered matches belong in Premium with deeper match statistics. Matches without verified GRID coverage remain standard PandaScore matches. Premium grouping is not permission to sell or redistribute GRID data.

## Verified repository state

Remote main at review: `634f9b2431ed94bdea17856e57e78245d89c573e`. Local main's retirement commit `2896c6f` has the identical tree, but divergent commit identity; no reset or rewrite performed.

The retained GRID code was dedicated to the November 14 Worlds final. Its public component was removed when Worlds ended. It uses server-side credentials, 60-second request caching, an 8-second timeout, detailed snapshot query and basic-field fallback. The normalizer supports scores, per-game clocks, champions, combat/economy/vision, objectives and nested statistics. Fields available in schema are not a guarantee of account access or populated values.

Supabase authentication is disabled scaffolding. `/login` says no account is needed. There is no subscription, Stripe checkout, webhook, server entitlement or paywall implementation.

## Reviewable groundwork

- `getGridSeries(id)` decouples snapshot retrieval from Worlds discovery, validates IDs and the returned series identity. The historical adapter remains compatible.
- `matchCoverage` groups an explicitly linked, successfully retrieved GRID series into Premium. Missing, mismatched, unavailable or unknown coverage remains standard. It does not generate provider mappings or entitlements.
- No new routes or external data exposure. No live key available in this executor, so no live match inventory is claimed.

## Implementation sequence

1. Verify current account agreement, permitted titles/tournaments, display/redistribution rights and whether paid access is an approved purpose.
2. Query Central Data with a bounded date range, explicit pagination and supported titles. Distinguish listed schedule from retrievable Series State. Do not assume all LoL/Valorant or all listed series have rich coverage.
3. Keep provider IDs namespaced. Match providers using verified mappings (game, tournament, both teams, scheduled start), never identical numeric IDs or team name alone. Leave ambiguous rows separate rather than attach incorrect telemetry.
4. Add `/premium` and `/premium/match/[gridId]` with reusable details UI. Show actual full/basic coverage, source timestamps and pending/missing fields. Keep ordinary schedules/streams working. Finished series stay in Results/history. Do not restore the retired Worlds promotion.
5. Use a shared bounded cache and global per-provider request budget, backoff for 429/5xx, deduplicated in-flight requests, slower completed-series refresh and visible stale state. Never fan out full snapshots across every card on every page load.
6. If paid access is intended: agree pricing, billing provider, cancellation/trial policy and approved data rights. Enforce server entitlements, including APIs, SSR, cache separation and agent endpoints; never rely on a client-only hidden panel. No billing activation in this groundwork.
7. Test provenance, unavailable data, live/completed status, spoofed IDs, quota errors, cross-user cache leaks, mobile tables and existing PandaScore/agent routes. Run lint, all unit tests, build and rendered-route/cache checks before publication.

## Sources and unresolved rights

- Current [GRID plans](https://grid.gg/plans/) states products and rights are scoped to the applicable agreement; Media plans are custom-priced and not for betting-related use.
- [Official OA Quick Start](https://grid.helpjuice.com/3673199) documents Central Data and Series State endpoints. It also says OA excludes LoL/Valorant and several products. This conflicts with the repo's record of a successful LoL final snapshot. Verify this account's real entitlement rather than claiming either general LoL availability or that the existing snapshot was impossible.
- [2024 GRID overview](https://grid.gg/resources/newsroom/what-is-grid-open-access/) describes select CS2/Dota2 historical coverage and commercial live data. It is historical, not an account contract.
- [2022 early-access agreement](https://cdn.grid.gg/gridgg/GRID_Open_Data_Platform_Agreement_05.04.2022.pdf) allowed approved-purpose use below an annual revenue threshold, required new authorization for a changed purpose, and imposed title-specific and confidentiality restrictions. It is not evidence that this account currently has unrestricted commercialization or redistribution rights.

Gmail search located a registration verification message, not a current executed data-use agreement. No outreach was sent, terms accepted, paid service provisioned or production change made. Victor clarified that this is a free Premium-quality category, not paid membership. No monetization decision is pending. Verify current GRID display rights and actual title coverage before describing coverage as complete.

## Clarified implementation

`/premium` now provides a bounded 3-day GRID Central Data listing (up to 50 entries, honestly marked partial when paginated). It does not fetch snapshots for every card. `/premium/[id]` renders the requested series snapshot, details and players on demand. No guessed PandaScore-to-GRID mappings are made. The GRID listing deliberately calls fixtures candidates rather than claiming rich statistics before a successful snapshot. No source credentials or raw feed endpoint are exposed.

## Production verification and guardrail

The first production catalogue check on November 15 returned only series 3 and 74, both under `GRID-TEST`. Series 3 returned rich player/champion/clock statistics, but that is **test coverage**, not proof of live competition entitlement. Test/demo/sample tournaments are excluded from the Premium listing. Direct snapshots identified as tests are clearly labelled; unlisted snapshots are labelled unverified and a started snapshot is never called proof of a live match. Actual competition coverage and account display rights remain unverified. No paid services were enabled.

## Historical access verified

The current/upcoming window is **not** an entitlement audit. The existing verified final ID `3012986` now returns a completed, detailed Gen.G Esports–BILIBILI GAMING snapshot (1–3). The new `/premium/results` archive uses that known record, checking ID, completed state and both opponents before displaying it; Results links to the archive. This preserves the decision to retire the Worlds promotion while retaining useful historical stats. No PandaScore ID equivalence is guessed.

The [new Riot Open Access programme](https://grid.gg/riot-open-access/) launched November 12, 2026 and explicitly includes LoL and VALORANT Central Data, Series State and Loopfeed. The older generic quick-start exclusion does not describe this programme. Current terms on that official page limit OA to non-commercial learning/experimentation and exclude betting/gambling. Free-to-view does not by itself establish commercial usage rights. Browser account verification could not be completed because the portal rendered blank; the production sensitive key was not exported or modified.
