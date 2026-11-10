# HomeSports

An importance-ranked League of Legends and Valorant esports matchboard. Visitors can switch between the two games; Valorant lives under `/valorant` with its own matches, results, calendar, teams, competitions, and brackets.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `PANDASCORE_API_KEY` in `.env.local` to use the live PandaScore feed. Without it, the UI uses three clearly labelled demo matches.

Match-winner odds from Odds-API.io are supported on both game boards but disabled by default pending product-policy review. In an approved environment set `ENABLE_ODDS=true` and `ODDS_API_KEY`. Unmatched games show no odds. `ODDS_BOOKMAKERS` and `ODDS_MAX_EVENTS` are optional. Prices are decimal market averages, refreshed through a 60-second cache, not a betting offer or guaranteed live price. There are no wager or affiliate links. Riot's developer policy prohibits betting or gambling functionality and requires review of product changes, so confirm whether displaying odds is permitted before enabling this feature publicly.

Visible, online matchboards refresh about once a minute. Background/offline tabs pause, requests do not overlap, and failures back off up to 15 minutes. The initial server feed is reused instead of immediately fetched again; failed refreshes retain the displayed schedule. A shared 60-second Next.js Data Cache stores the normalized match feed separately for LoL and Valorant, so pages, API polling, calendars, and Worlds reuse processing as well as upstream data. A feed regeneration requests three to five match pages, fetching second pages only when the first is full; monitor combined provider usage and rate limits in production. Valorant's running match endpoint does not provide live round-by-round telemetry, so the site only displays the match status and series scores published by the provider.

The `/worlds` hub shows only Worlds 2026 matches published in the live feed. It separates Swiss records from knockout brackets, uses device-local times after hydration, and hides results by default. Team calendar subscriptions use the public `/api/calendar/team/<id>` feed; supported calendar apps can refresh it when fixtures change and display a one-hour match alert. Follows and the spoiler preference remain in the current browser.

Passwordless login is scaffolded with Supabase. To enable it, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then configure the production site and `/login` redirect URLs in Supabase Auth.

Accounts are intentionally disabled in the public beta. Do not set `NEXT_PUBLIC_ENABLE_ACCOUNTS=true` until cookie-based SSR sessions, Row Level Security, account deletion, and data export are implemented. Team follows currently stay in the browser and team calendar feeds contain public schedule data.

Every pull request and push to `main` runs lint, unit tests, a production build, and the isolated production cache smoke test in GitHub Actions. The live-data badge shows the latest successful feed refresh; if PandaScore is unavailable, the site labels the fallback as degraded demo data.

See [TODO.md](./TODO.md) for the prioritized product, reliability, account, alert, and revenue work.

## Preselect Twitch Extension

HomeSports includes the complete Preselect Twitch Extension source in [`projects/preselect-twitch-extension`](./projects/preselect-twitch-extension) and a product page at `/preselect-twitch-extension`. Preselect lets viewers predict professional League of Legends champion lock-ins during live co-streams and compete on game and series leaderboards. Its production-readiness work is tracked in the nested [`TODO.md`](./projects/preselect-twitch-extension/TODO.md).

## Importance rating

The rules live in `src/lib/matches.ts` and are intentionally transparent:

- 5 stars: international finals and knockout matches, top-league finals
- 4 stars: international event matches and top-league playoff series
- 3 stars: LCK, LPL, LEC, LTA and LCP regular season; other playoffs
- 2 stars: other regional competition
- 1 star: development and academy leagues

Next iteration: add a small editable team/rivalry boost table after observing the real schedule.

## Daily League games

`/play` includes champion clues, name scrambles, portrait pairs, ultimate identification, and champion-title quizzes. The puzzle pool contains 46 champions; the autocomplete roster contains 173 names from Riot Data Dragon 16.20.1. Artwork is checked into `public/league`, so playing does not require a Riot CDN request. Names, classes, titles, passives, and ultimates come from Data Dragon; region associations are editorial hints. Classes are not claimed to be current lane assignments.

Refresh the data and artwork with `node scripts/update-challenge-data.mjs <version>`. Review generated changes and bump the saved-progress version when the puzzle pool changes. The expanded pool uses `homesports:daily:v3` so older answers are not applied to different puzzles. Data source: https://developer.riotgames.com/docs/lol#data-dragon.

All five puzzles rotate automatically at 00:00 UTC without a scheduled server job. Each guessing mode cycles through all 46 champions before repeating, with distinct answers across modes on a given day. Memory uses six new champions each day and a date-seeded layout. The reset countdown updates every second; returning to a background tab refreshes the day immediately. Saved progress is scoped to the UTC date and game, so yesterday’s completion never locks today’s game.

## Worlds on All Matches

The League All Matches tab separates Worlds 2026 from other competitions. Its tournament section includes Play-In, Swiss match groups and records, and source-backed Play-In/Knockout brackets. Match filters apply to stage lists; brackets deliberately show the complete stage. Scores start hidden. UTC date groups are labelled separately from device-local match times.

`getWorldsData` fetches the published season schedule in pages and the provider’s bracket dependencies, so tournament history is not limited to the general matchboard’s recent-match window. `/api/worlds` caches responses for 60 seconds; the section refreshes every minute and retains available data during failures. Unknown teams and missing brackets are labelled rather than inferred. The provider’s “Group Stage” label is recognized as Swiss specifically for Worlds 2026.

The banner at `public/worlds/worlds-2026.jpg` is Riot’s official Worlds 2026 artwork, including its event logo, from the [Worlds 2026 primer](https://lolesports.com/en-GB/news/worlds-2026-primer). Original image: https://cmsassets.rgpub.io/sanity/images/dsfx7636/news_live/a57a2226c2721c242aaf53c771ad13d4e505962f-1920x1080.jpg.

## Match previews

Match cards on the boards and Worlds views open `/match/<id>?game=lol` (or `game=valorant`). Team links, follows, and stream buttons keep their separate actions. Published Worlds bracket matches also open previews; synthetic fallback brackets do not receive match links.

Previews include team logos, optional series scores, and transparent recent-form win estimates. The estimate uses up to 10 completed series per team in the preceding 180 days, with at least five valid results required for each team. Scores are matched by team ID; other games, duplicate records, tied/incomplete results, and results after the cutoff are excluded. Smoothed win rates `(wins + 2) / (series + 4)` are compared using relative win/loss odds and normalized to 100%. This is an uncalibrated heuristic, not bookmaker or live odds, and does not model strength of opposition, drafts, or roster changes. In-progress matches retain a pre-series cutoff. Finished/cancelled matches and insufficient-data cases show no forecast. No odds integration is enabled by this feature.

## CPU and cache regression checks

Run `npm run lint`, `npm test`, `npm run build`, and `npm run test:cache`. The cache smoke test builds a temporary copy with a synthetic provider, makes local requests, and removes that copy afterward. It never uses production credentials or calls external providers and does not replace the normal `.next` build.

Team, tournament, season, and bracket routes for both games use on-demand ISR (`generateStaticParams` returns an empty array). The first visit generates the page; subsequent visits share the complete rendered response. Match previews remain dynamic because their game comes from the query string. Calendar responses are CDN-cacheable for five minutes, with a one-minute stale-while-revalidate window. Live boards and shared feeds retain their one-minute refresh target; ISR/CDN responses may briefly be stale during background regeneration.

After deploying, compare the same traffic window's Active CPU, invocation counts, route cache hits, and PandaScore 429s in Vercel. Check live-score freshness and both games. This reduces avoidable processing; it is not a traffic cap and does not restore an already-exhausted team quota. Do not deploy or change the Vercel plan as part of running these local checks.

## Provider resilience and hydration

All PandaScore reads share a warm-process request guard: identical in-flight reads/JSON parsing are coalesced, at most three requests run concurrently, and a 429 pauses queued/new requests for `Retry-After` (60 seconds if absent/invalid). Requests time out after ten seconds with no immediate retries. This is per-process coordination, not an account-wide distributed rate limiter; the provider can still rate-limit the account. Failure logs identify the endpoint, numeric page and HTTP status, without credentials.

Only complete successful match feeds replace the shared Data Cache. Failed refreshes retain its last successful snapshot; on a first-ever cold miss, any successful pages remain available with a degraded label. Snapshots over three minutes old are also labelled degraded. Calendar outages return 503 rather than an empty subscription that could remove events.

Matchboard time labels use a fixed locale and UTC for server rendering and the first client render, then switch to device-local formatting after hydration. Countdowns start after hydration from one client clock and update each minute, avoiding timezone and clock-drift hydration mismatches. Tests cover these boundaries; the isolated cache test also simulates an expired snapshot, a provider 429 outage and successful recovery.

## Match-specific stream links

League and Valorant use PandaScore's stream list first. We keep every supported language, prefer official/main broadcasts, deduplicate equivalent URLs, recover supported embedded-player links and older match-specific stream fields, and reject unsafe or indirect URLs. Upcoming cards now expose the published stream rather than waiting for a live status. Board, preview, Worlds, calendar and team/Valorant competition views share the same stream control and alternate-stream menu. Finished matches do not advertise a channel as a replay.

When the primary list is empty or invalid, the secondary source is **VLR.gg** for Valorant and Riot's official **LoL Esports** schedule for League. Only links attached to a uniquely identified match can be used. Valorant requires both full opponent names, competition/season evidence, schedule agreement within one minute, and a live source status for running matches. League requires the exact two full names and scheduled instant, plus an in-progress official event for a running match. Ambiguous, unread, missing, completed or incompatible records produce no fallback. Event-wide channel guesses, search links, and links copied from another match are never used.

Coverage is not guaranteed: lower-tier fixtures may have no broadcast, VLR may not list a stream, and the official League homepage exposes only its current schedule window. Changed team names, changed schedules or source markup can prevent a strict match. Live cards explicitly say “No verified stream available”; upcoming cards say “Stream not announced.” A provider-listed broadcast is not independent proof that the channel is currently online.

Secondary work is bounded to 12 missing-link targets per batch, prioritizing live games, with at most two index pages, three event pages and eight detail pages for Valorant, or one official schedule page for League. Normalized fallback results use a five-minute shared Data Cache. A bounded warm-process page cache also reuses source pages across board, preview and Worlds requests (five minutes, at most 40 entries/20 MB), coalesces pending URLs, and globally allows at most two source requests at once. League's parsed schedule is reused too. Each lookup has an eight-second deadline, no credentials or redirects, no immediate retries, and response size limits. Failures never replace usable PandaScore links or fail the match feed. These warm-process limits are not a global distributed rate limiter.

Validation: `npm test` covers URL safety, official/main priority, alternate languages, exact-match source parsing, missing/ambiguous fixtures, finished-match labels, source failures, deadline/concurrency limits and cross-request cache reuse. The normal build and `npm run test:cache` remain required. In a worktree with an external `node_modules` symlink, use `npm run build -- --webpack` because Turbopack rejects that filesystem layout.
