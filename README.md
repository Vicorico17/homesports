# HomeSports

An importance-ranked League of Legends esports matchboard.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `PANDASCORE_API_KEY` in `.env.local` to use the live PandaScore feed. Without it, the UI uses three clearly labelled demo matches.

For optional pre-match esports odds, set `ODDS_API_KEY` and optionally `ODDS_BOOKMAKERS` (comma-separated, default: `Bet365,Unibet`). `ODDS_MAX_EVENTS` defaults to 10. Odds use the provider's multi-event endpoint and are cached for 15 minutes; this keeps the default pending/live feed below 500 API calls per day. Affiliate links are not implemented.

The app polls PandaScore through Next.js's server cache once a minute. It requests the running, upcoming and finished endpoints, which is roughly 180 API calls/hour—well inside the free plan's 1,000-request hourly cap.

## Importance rating

The rules live in `src/lib/matches.ts` and are intentionally transparent:

- 5 stars: international finals and knockout matches, top-league finals
- 4 stars: international event matches and top-league playoff series
- 3 stars: LCK, LPL, LEC, LTA and LCP regular season; other playoffs
- 2 stars: other regional competition
- 1 star: development and academy leagues

Next iteration: add a small editable team/rivalry boost table after observing the real schedule.
