# HomeSports roadmap

## Immediate — test and trust

- [ ] Verify the deployed KT Rolster Challengers page shows Ghost as Bot/ADC and Pollu as Support after commit `7b55c6d` reaches Vercel.
- [ ] Add saved roster-parser fixtures for KT Rolster, KT Rolster Challengers, Gen.G, and one LEC team so Leaguepedia markup changes cannot silently break roles.
- [ ] Visually verify current LCK and LEC season pages, stage pages, standings, and brackets on desktop and mobile.
- [ ] Add source-health monitoring for PandaScore and Leaguepedia, including stale-data timestamps and alerts when a roster or competition becomes incomplete.

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
