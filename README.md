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

The browser refreshes once a minute. The shared match API and PandaScore requests cache for 60 seconds, so active viewers share upstream feeds. LoL and Valorant each request five match pages per refresh cycle when visited; monitor combined provider usage and rate limits in production. Valorant's running match endpoint does not provide live round-by-round telemetry, so the site only displays the match status and series scores published by the provider.

The `/worlds` hub shows only Worlds 2026 matches published in the live feed. It separates Swiss records from knockout brackets, uses device-local times after hydration, and hides results by default. Team calendar subscriptions use the public `/api/calendar/team/<id>` feed; supported calendar apps can refresh it when fixtures change and display a one-hour match alert. Follows and the spoiler preference remain in the current browser.

Passwordless login is scaffolded with Supabase. To enable it, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then configure the production site and `/login` redirect URLs in Supabase Auth.

Accounts are intentionally disabled in the public beta. Do not set `NEXT_PUBLIC_ENABLE_ACCOUNTS=true` until cookie-based SSR sessions, Row Level Security, account deletion, and data export are implemented. Team follows currently stay in the browser and team calendar feeds contain public schedule data.

Every pull request and push to `main` runs lint, unit tests, and a production build in GitHub Actions. The live-data badge shows the latest successful feed refresh; if PandaScore is unavailable, the site labels the fallback as degraded demo data.

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
