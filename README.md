# HomeSports

An importance-ranked League of Legends esports matchboard.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `PANDASCORE_API_KEY` in `.env.local` to use the live PandaScore feed. Without it, the UI uses three clearly labelled demo matches.

Pre-match odds are disabled by default while product-policy approval is reviewed. To enable them in an approved environment, set `ENABLE_ODDS=true` and `ODDS_API_KEY`; `ODDS_BOOKMAKERS` and `ODDS_MAX_EVENTS` remain optional. Affiliate links are not implemented.

The app polls PandaScore through Next.js's server cache once a minute. It requests the running, upcoming and finished endpoints, which is roughly 180 API calls/hour—well inside the free plan's 1,000-request hourly cap.

Passwordless login is scaffolded with Supabase. To enable it, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then configure the production site and `/login` redirect URLs in Supabase Auth.

See [TODO.md](./TODO.md) for the prioritized product, reliability, account, alert, and revenue work.

## Importance rating

The rules live in `src/lib/matches.ts` and are intentionally transparent:

- 5 stars: international finals and knockout matches, top-league finals
- 4 stars: international event matches and top-league playoff series
- 3 stars: LCK, LPL, LEC, LTA and LCP regular season; other playoffs
- 2 stars: other regional competition
- 1 star: development and academy leagues

Next iteration: add a small editable team/rivalry boost table after observing the real schedule.
