# HomeSports roadmap

## Worlds 2026 launch — October 8 target

Full dated plan: [Worlds launch plan](docs/worlds-2026-launch-plan.md) · [HTML reading copy](outputs/worlds-2026-launch-plan.html). Confirmed marketing budget: $300–$1,000; proposed base $700. Worlds begins October 15; feature freeze October 4. These are planned tasks, not completed features.

- [ ] Reserve/create founder-owned TikTok, Instagram and Reddit accounts; confirm handles, recovery and profile links by September 16.
- [ ] Build `/worlds` with verified 2026 stage IDs, local times, team follows and official watch links.
- [ ] Support Swiss records/draws separately from knockout brackets; never guess future matchups.
- [ ] Build and test spoiler controls before marketing a spoiler-free experience.
- [ ] Verify calendar behavior, mobile flows, stale-source fallback and production data during current playoffs.
- [ ] Add Worlds-specific metadata, self-canonicals, sitemap and acquisition/core-action measurement.
- [ ] Recruit 10–15 volunteer beta testers through approved channels for the September 27 preview.
- [ ] Prepare four weekly TikTok/Reels videos, two weekly carousels and launch-day drafts.
- [ ] Review Reddit/Discord rules; obtain required permissions for each concrete promotional post.
- [ ] Qualify ten small creator/community partners from current public evidence; no bulk unsolicited outreach.
- [ ] Complete October 4 readiness review, launch October 8 and rehearse October 12–14.
- [ ] Assign matchday coverage and backup; recheck official schedules and monitor corrections through November 14.
- [ ] Review activation and channel performance weekly; publish post-Worlds retrospective November 15–20.

## Immediate — test and trust

- [ ] Verify the deployed KT Rolster Challengers page shows Ghost as Bot/ADC and Pollu as Support after the next deployment reaches Vercel.
- [x] Add saved roster-parser fixtures for KT Rolster, KT Rolster Challengers, Gen.G, and one LEC team so Leaguepedia markup changes cannot silently break roles.
- [ ] Visually verify current LCK and LEC season pages, stage pages, standings, and brackets on desktop and mobile.
- [x] Show PandaScore source health, degraded fallback state, and the latest refresh timestamp to users.
- [ ] Add external source-health alerts when PandaScore or Leaguepedia becomes stale or a roster/competition becomes incomplete.
- [x] Add strict linting and CI gates for lint, tests, and production builds.
- [x] Add canonical/social metadata, icons, robots.txt, sitemap.xml, support link, 404, and error recovery pages.

## Supabase and accounts

- [ ] Decide where HomeSports will live in Supabase. The free account currently allows two projects: first consider reusing a suitable existing project or pausing/removing an unused project; upgrade only if a dedicated third active project is genuinely needed.
- [ ] Create or select the Supabase project and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel.
- [ ] Configure `https://homesports.vercel.app` as the Auth Site URL and allow `https://homesports.vercel.app/login` as a redirect URL.
- [ ] Replace the initial browser-only auth scaffold with cookie-based SSR sessions before protecting paid or private data.
- [ ] Create a `followed_teams` table with Row Level Security so follows sync safely across devices.
- [ ] Migrate existing local-browser follows into the signed-in account after the user confirms.
- [ ] Require a valid server session for calendar feeds; hiding the button alone is not sufficient access control.
- [ ] Add sign out, account deletion, and data-export controls.

## Alerts and retention

- [ ] Add per-team and per-competition alert preferences.
- [ ] Choose an email provider and scheduled-job system, then send testable match reminders.
- [ ] Add alert timing choices such as 24 hours, 1 hour, and live now.
- [ ] Prevent duplicate reminders when match times are rescheduled.
- [ ] Update the privacy notice before storing account data or sending email.

## Revenue

- [ ] Enable and review Vercel Analytics; measure stream opens, follows, calendars, alerts, and weekly returning users.
- [ ] Confirm Riot product registration/monetization approval before charging users.
- [ ] Validate a Founding Supporter offer before building the full premium tier.
- [ ] Add Stripe Checkout only after the paid proposition and Riot approval are confirmed.
- [ ] Keep schedules, scores, streams, basic standings, and rosters free; charge for personalization, alerts, convenience, and supporter benefits.

## Growth and later work

- [ ] Add shareable weekly “matches worth watching” schedules.
- [ ] Improve team and competition metadata for search engines and social previews.
- [ ] Pilot an embeddable schedule/standings widget with League communities.
- [ ] Explore a Discord integration after the website, accounts, and alert delivery are reliable.

## Completed checkpoints

- [x] Live and upcoming matches remain on the main page.
- [x] Team pages include form, roster, upcoming games, match history, and team calendars.
- [x] Competition season pages are separate from Regular Season/Playoff stage pages.
- [x] Leaguepedia-first standings and bracket safeguards are implemented.
- [x] Invalid placeholder dates and guessed standings/brackets are suppressed.
- [x] Local followed-team filtering is available.
- [x] Product analytics instrumentation and a privacy page are present.
- [x] Passwordless login UI and Supabase client scaffolding are present.
- [x] Accounts are feature-disabled until server sessions and account-data controls are safe to launch.
- [x] Public calendar behavior and privacy copy accurately describe the current product.
