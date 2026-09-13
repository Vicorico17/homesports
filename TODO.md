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

## Go-to-market execution

### Positioning and launch assets

- [ ] Use the promise: “Your Worlds matchday, in one place.”
- [ ] Keep the core site free and open to everyone; do not present HomeSports as an official Riot or LoL Esports account.
- [ ] Prepare a 20-second product demo, one schedule carousel, one format explainer, one founder story, and one launch post.
- [ ] Use only verified fixtures, times, teams, and official watch destinations; label limitations and source freshness.

### Social accounts

- [ ] Create founder-owned TikTok, Instagram, and Reddit accounts with one consistent handle, business email, recovery method, and 2FA.
- [ ] Complete bios, logos, links, disclosures, and pinned launch content.
- [ ] Publish four short videos per week, two Instagram carousels per week, and useful matchday Stories during Worlds.
- [ ] Reuse one verified matchday asset across TikTok, Instagram, Reddit, and approved Discord channels without copy-pasting spam.
- [ ] Track each asset with `worlds_2026_launch`, source, medium, and content identifiers.

### Community distribution

- [ ] Review current rules for r/leagueoflegends, team subreddits, PedroPeepos, r/LoLeventVoDs, and relevant Discord servers before every post.
- [ ] Ask moderators for permission where required; never post first and ask later.
- [ ] Participate helpfully in communities before promotion; do not manufacture karma, buy votes, or use unsolicited DMs.
- [ ] Recruit 10–15 volunteer testers through approved channels and record task completion/failures.
- [ ] Identify up to ten small LoL/esports creators with public contact routes and relevant audiences.
- [ ] Run one creator test at a time with a fixed deliverable, unique attribution link, disclosure, and spending cap.

### Launch measurement

- [ ] Define activation as a session with a follow, calendar action, or stream open.
- [ ] Set the working target of 20% activation after 100 attributable sessions; treat it as a diagnostic target, not a forecast.
- [ ] Review channel quality weekly: activated sessions, returning users, useful feedback, cost per activated session, and critical data errors.
- [ ] Pause any channel or creator test that produces views without useful sessions or creates community complaints.

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

The first revenue generator is an approved, clearly disclosed affiliate placement. Crypto is the preferred payout currency; visitors do not need a wallet. Gambling ads are a later, market-eligibility workstream and must never be enabled globally by default.

### Revenue gate: prove the audience first

- [ ] Establish the operating business country, target advertising countries, adult eligibility policy, and responsible-gambling/disclosure requirements.
- [ ] Record baseline last-30-day sessions, returning users, countries, stream clicks, team follows, calendar actions, and acquisition sources.
- [ ] Launch Worlds and collect at least one useful audience/activation signal before applying to betting affiliates.
- [ ] Create a one-page media kit with verified traffic, audience description, placements, screenshots, contact details, and current limitations.

### Revenue generator: one approved affiliate pilot

- [ ] Obtain written permission from the selected operator for this publisher, traffic markets, placements, and esports context.
- [ ] Request current terms: CPA/revenue share, NGR deductions, negative carryover, qualifying customer, attribution window, payout threshold, crypto asset/network, fees, KYC, and prohibited traffic.
- [ ] Qualify Cloudbet and Stake for eligible adult markets; qualify Razer or another gaming-hardware program as a non-gambling fallback.
- [ ] Confirm Riot and PandaScore/data-provider permissions before using odds, betting language, or gambling-related calls to action.
- [ ] Build a partner registry: partner ID, category, destination, country allowlist, approval status, disclosure text, expiry, and global kill switch.
- [ ] Serve gambling offers only when eligibility is known; suppress them when country or age eligibility is unknown. Never place them on youth/academy contexts.
- [ ] Add an allowlisted redirect with `rel="sponsored noopener"`, partner sub-ID, and no wallet/email data in tracking parameters.
- [ ] Add aggregate impression, click, source, placement, and partner tracking; reconcile conversions against the partner report/postback.
- [ ] Add an affiliate disclosure page and update privacy/cookie language before the first live link.
- [ ] Run one placement for 14 days with a fixed cap; compare eligible sessions, activated sessions, clicks, approved conversions, commission paid, complaints, and retention.
- [ ] Do not expand until the first commission is actually paid and the placement has a useful signal.

### Commercial products after the affiliate pilot

- [ ] Test a hardware/gaming affiliate module for the broad audience, with crypto payout only if the program supports it.
- [ ] Validate a Founding Supporter offer for personalization, alerts, convenience, and supporter benefits; keep scores, schedules, streams, standings, and rosters free.
- [ ] Confirm Riot product registration/monetization approval before charging users.
- [ ] Add Stripe Checkout only after the paid proposition and Riot approval are confirmed.
- [ ] Defer crypto payments, wallets, tokens, prediction prizes, and on-site betting until separately scoped and legally reviewed.

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
