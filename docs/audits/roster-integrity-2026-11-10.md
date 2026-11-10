# Roster integrity audit — 10 November 2026

## Scope and limits

Inspected the deployed code at `d2468a0` and ten public team pages (five LoL, five Valorant), two deliberately cross-game team URLs, and the G2 Valorant match preview. The public feeds contained 204 LoL and 256 Valorant matches at the time of inspection; these include old/undated records and are not a count of current active competitions. This was a targeted audit, not independent verification of every player, portrait, team, or match in the feed.

No authenticated PandaScore API access was available for this audit. The new tournament-roster integration is validated against the provider's published OpenAPI contract and synthetic local production tests, not an authenticated live response. Before release, an authorized maintainer must verify representative live tournament responses for both games and the no-roster case. The absence of a returned squad must stay visible; it must not trigger a guessed/current-team replacement.

## Confirmed defects

1. **Wrong game accepted on team routes.** `/teams/128917` rendered Paper Rex's Valorant players under the LoL route, and `/valorant/teams/2882` rendered Gen.G's LoL players under Valorant. Team resources use `current_videogame`, not only `videogame`.
2. **Current contract membership used as match participation.** Match previews read `/teams/{id}`. PandaScore explicitly warns that team-level players represent current contracts, not tournament participants. Its example is a contracted Fnatic player who did not participate in that tournament. Historical matches can therefore show new signings, omit departed participants, or include staff/creators.
3. **Known non-players rendered as players.** G2 Valorant's public team page and match `/match/1368476?game=valorant` displayed shhhack (PandaScore ID 25474) and shanks (26196) with leaf and trent. G2's own page identifies Shhhack as assistant coach. VLR lists only leaf/trent as current players and shhhack as inactive staff; Liquipedia labels Shanks a streamer. The current G2 provider roster is quarantined pending a new source-backed review rather than silently inventing replacements.
4. **Unsupported LoL verification.** The LoL team page treated any nonempty Leaguepedia parse, or five role-shaped provider entries, as a verified lineup. It filled missing roles from a different source and attached portraits by normalized nickname. A partial parse is not independent confirmation of the whole roster, a five-role shape does not establish starters, and a display name is not a stable identity.

## Sample observations

These names were observed on the public HomeSports pages. Only the comparisons explicitly described below were independently reconciled.

| Game | Team / provider ID | Displayed names |
| --- | --- | --- |
| LoL | Gen.G / 2882 | Kiin, Canyon, Chovy, Ruler, Duro |
| LoL | Bilibili Gaming / 1566 | Bin, Xun, Knight, Viper, ON |
| LoL | KT Rolster / 63 | PerfecT, Cuzz, Bdd, Jiwoo, Effort |
| LoL | KT Rolster Challengers / 128348 | Sero, Sylvie, Hwichan, FenRir, Pollu |
| LoL | G2 Esports / 88 | BrokenBlade, SkewMond, Caps, Hans Sama, Labrov |
| Valorant | Paper Rex / 128917 | f0rsakeN, something, invy |
| Valorant | Fnatic / 128537 | Cloud, kaajak |
| Valorant | G2 Esports / 128538 | shhhack, shanks, leaf, trent |
| Valorant | BOOM Esports / 128744 | NcSlasher, naTz, Famouz, roseaufy, KellyS, xan, Iceyyy, Laze |
| Valorant | Seventh Letter Gaming / 139556 | JayH, AmerNone, SCar, BEASTJefz, netlov |

Gen.G's five agree with the organization's official LoL page. Paper Rex's three agree with VLR's current player list after offseason departures. Therefore a current squad smaller than five is not automatically incorrect and must not be padded. G2's disagreement is confirmed as described above. Fnatic's broad talent directory includes older player/staff profiles, so it was not treated as a definitive current competitive lineup. Remaining samples were inspected but not independently certified.

## Implemented safeguards

- Match pages use `/tournaments/{tournament_id}/rosters`, with the documented `{ type: "Team", rosters: [...] }` envelope, exact team ID, and correct game identity.
- Tournament squads are labelled as squads, not confirmed starters. An absent/invalid roster is unavailable; today's team profile is never substituted for it.
- Historical participants remain even if their present-day active flag or current team has changed. Ambiguous duplicate cross-team membership is omitted, not guessed.
- Current team pages validate provider team/game identity and omit explicit inactive players, mismatched current membership, malformed identities, duplicates, and roles explicitly identifying non-playing staff/creators.
- The audited G2 current roster is held for review. This is deliberately scoped to the current team listing, not used to rewrite historical tournament participation.
- No players are added just to produce five names, and no player identity/portrait is joined across sources by nickname.
- LoL's runtime Leaguepedia parse/merge and automatic name-based team redirects are removed. Existing parser fixtures remain unit fixtures, not evidence of live correctness.
- Requests reuse the provider's shared concurrency/rate-limit handling and a 300-second cache. One tournament roster read replaces two team profile reads on a match page. Response dates are labelled as provider response times, not lineup verification times.

## Remaining limits and release gate

This prevents the demonstrated mapping/claim errors but does not make PandaScore independently authoritative for every roster. Tournament registration is still not a confirmed match/map starting lineup; emergency substitutions and provider delays remain possible. Portrait authenticity was not visually verified for every player. Teams not independently reconciled may still have upstream errors, including staff whose roles are omitted by the provider.

Before deployment: inspect authenticated live responses for both games, confirm active and historical match examples against official match records, inspect small/missing squads in the UI, and rerun the aggregate checks on the integrated branch. Do not label the whole dataset verified. For exact per-map starters, add an authorized, covered match/game participant source rather than inferring from team or tournament membership.

## Sources

- PandaScore roster distinction: https://developers.pandascore.co/docs/tournaments-in-depth
- Tournament roster endpoint and published schema: https://developers.pandascore.co/reference/get_tournaments_tournamentidorslug_rosters
- Change tracking: https://developers.pandascore.co/docs/tracking-changes
- Live incorrect G2 listing: https://www.homesports.lol/valorant/teams/128538
- Live incorrect G2 match listing: https://www.homesports.lol/match/1368476?game=valorant
- G2 official staff role: https://g2esports.com/pages/team/valorant
- G2 current competitive roster and staff: https://www.vlr.gg/team/11058/g2-esports/
- G2 creator role: https://liquipedia.net/valorant/G2_Esports
- Gen.G official roster: https://geng.gg/pages/league-of-legends
- Paper Rex current roster: https://www.vlr.gg/team/624/paper-rex/
- Fnatic directory (not accepted as current lineup evidence): https://fnatic.com/talent

## Verification performed

- `npm test`: 77 passing tests, including eight roster-integrity tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build -- --webpack`: passed.
- `npm run test:cache`: passed. Additional production-render checks cover LoL and Valorant tournament squads, no current-member fallback, and rejection of cross-game team routes; existing caching, rate-limit retention, and recovery checks still pass.
- `git diff --check`: passed.
- Browser visual QA was attempted, but the cloud browser could not reach the isolated local server (`ERR_CONNECTION_REFUSED`). Rendered HTML was tested; visual/browser behavior is not claimed verified.
- No deployment, remote push, provider credential access, or provider data mutation was performed.
