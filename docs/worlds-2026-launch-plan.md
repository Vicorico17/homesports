# HomeSports · Worlds 2026 launch plan

Prepared September 13, 2026. Status: proposed execution plan, not completed launch work.

**Public launch: October 8. Worlds starts: October 15. Our promise: “Your Worlds matchday, in one place.”**

The strategy is to earn a daily habit among English-speaking League esports viewers through a useful Worlds hub, team-specific community distribution, and repeatable short-form content. “Best place to follow Worlds” is the ambition; demonstrate it with working features rather than unsupported superiority claims.

## Decisions and assumptions

- HomeSports remains free and accessible to everyone. No site-wide adult gate.
- Affiliate commissions paid in crypto remain a commercial preference. Gambling advertising is a separate, later eligibility workstream and is not required to launch Worlds coverage.
- Start with English-speaking viewers, testing EU- and North America-oriented posting windows. These are audience hypotheses, not known visitor demographics or approved gambling markets.
- Assume one founder with 10–15 marketing hours/week, separate from development. Confirmed planning budget: $300–$1,000 for organic promotion plus small creator tests. The proposed base allocation is $700 through Worlds; no spend has been committed.
- Create TikTok, Instagram and Reddit accounts as explicit launch tasks. Handles, ownership email, account verification and availability are not yet confirmed. No accounts or posts have been created in this planning task.
- Owner labels below: **Build** = implementation work for Codex/developer; **Founder** = business decisions, account ownership, content recording and human community participation; **Joint** = testing and launch review.

## Dates to plan around

| Milestone | Date | HomeSports action |
| --- | --- | --- |
| Preview usable | September 27 | Give a small invited test group a working Worlds hub |
| Feature freeze | October 4 | Fix critical issues; stop adding launch features |
| Public launch | October 8 | Publish founder demo, profiles and approved community posts |
| Final rehearsal | October 12–14 | Verify schedule, redirects, streams, coverage and rollback |
| Play-In | October 15–18 | Daily matchday coverage and immediate corrections |
| Swiss | October 23–26, 28–31 | Explain records, new draws and qualification status |
| Quarterfinals | November 3–6 | Verified bracket and match previews |
| Semifinals | November 7–8 | Next-match reminders and shareable finalist paths |
| Final | November 14 | Final-day companion and post-event retention prompt |
| Retrospective | November 15–20 | Report results; turn Worlds users into season followers |

Tournament dates are from [Riot’s MSI and Worlds update](https://lolesports.com/en-US/news/msi-and-worlds), checked September 13. Recheck official announcements weekly and before scheduled posts. Never invent unpublished matchups or start times. Internal dates are proposed deadlines.

## Positioning and audience

**Primary user:** a League esports fan who follows a few teams, wants to know what is on today, and moves between schedules, streams and standings. The immediate job is deciding when and where to watch.

**Adjacent user:** a viewer catching up after work. Spoiler control and accurate local times are the proposed differentiators to test.

**Distribution partner:** a fan-community moderator or small esports creator who repeatedly explains the schedule to their audience. Offer a useful matchday resource and ask for feedback, not a generic promotion swap.

**Not the initial target:** general casino traffic, people seeking in-game coaching, or broad gaming audiences with no esports interest.

Suggested launch headline: **Your Worlds matchday, in one place.**

Suggested subhead, publish only after the features pass QA: **See what’s next in your time zone, follow your teams, track every stage, and open the official stream. Free. No signup required.**

Primary CTA: **See today’s matches.** Secondary CTA: **Follow your team.**

Existing alternatives include LoL Esports, Flashscore and Leaguepedia. Do not promise to replace official broadcasts, drops, or every encyclopedia feature. Win a narrower job: open HomeSports and understand your next matchday in seconds.

## Product work before we promote it

The repo has a matchboard, team follows stored in the browser, team calendar downloads, stream links, and bracket work. A dedicated `/worlds` route, comprehensive spoiler controls, and Worlds-stage behavior still need implementation/verification. The current generic playoff view is not sufficient evidence that Swiss-stage progression works.

| ID | Priority | Deliverable and acceptance condition | Owner | Due |
| --- | --- | --- | --- | --- |
| P01 | P0 | `/worlds` canonical hub and prominent home navigation; correct 2026 tournament IDs; play-in/Swiss/knockout stages remain distinct | Build | Sep 20 |
| P02 | P0 | Today/next match, timezone label, upcoming/live/completed states and watch links work on mobile; distinguish scheduled from estimated starts | Build | Sep 22 |
| P03 | P0 | Accurate stage view: Swiss records/draws, knockout dependencies, TBD slots; do not invent future pairings or force Swiss into a knockout tree | Build | Sep 25 |
| P04 | P0 | Spoiler toggle persists; hides scores, winners, advancement clues and result-bearing previews before initial paint; no “spoiler-free” claim until tested | Build | Sep 25 |
| P05 | P0 | Follow team flow works from hub; existing calendar behavior tested for duplicates, reschedules and timezone handling; say download vs subscription accurately | Build | Sep 25 |
| P06 | P0 | Stale-feed timestamps, source outage state, recovery and official-source fallback; never present demo Worlds fixtures as real tournament data | Build | Sep 25 |
| P07 | P0 | Unique metadata/self-canonical for hub and key team/stage pages; sitemap links; share preview with no inadvertent spoilers | Build | Sep 27 |
| P08 | P0 | Test iOS Safari/Android Chrome and desktop; keyboard use, narrow screens, stream destinations, no blocked primary flow; record failures and fixes | Joint | Oct 2 |
| P09 | P0 | Analytics for hub visit, follow, stream click, calendar action, spoiler toggle and acquisition source; establish baseline and a weekly report | Build | Sep 27 |
| P10 | P0 | Stable production URL, support contact, attribution/IP review and privacy accuracy; any new domain gets tested redirects and canonical configuration | Founder + Build | Sep 27 |
| P11 | P1 | Shareable daily match card with date, timezone and source timestamp; export uses real schedule only | Build | Oct 2 |
| P12 | P1 | Lightweight format guide and team qualification pages sourced from official announcements | Founder + Build | Oct 4 |
| P13 | Later | Email reminders, synced accounts, paid tier, Discord bot, prediction prizes and affiliate advertising | Backlog | After launch review |

**Scope cut:** if time slips, remove P11/P12 and extra content formats first. Keep accuracy, stage separation, mobile usability and source health. If spoiler mode is incomplete, remove that promise and use an explicit live-results product positioning. If Swiss coverage is incomplete, launch a clearly described schedule/watch hub and withhold “track every stage.” Never substitute mock data to meet the date.

## Launch readiness decision

On October 4, record pass/fail evidence against P01–P10. October 8 promotion proceeds only if there are no known incorrect pairings/results or broken primary watch/schedule flows. Trial at least two real matchdays during current playoffs, with a deliberately simulated feed failure in a test environment. Synthetic stage fixtures belong in tests, not production.

Recruit 10–15 volunteer testers; ask them to find their next match, check its local time, follow a team and open a stream. Target at least 8 of 10 completing these unassisted. Record device, failure and fix rather than requesting vague ratings. These are internal targets, not existing user results.

## Social accounts: setup checklist

| Account | Setup | Purpose | Definition of ready |
| --- | --- | --- | --- |
| TikTok | Try `@homesports`, then `@homesportslol` or `@followhomesports`; choose one available consistent name | Discoverability through useful 15–30 second videos | Owner verified, recovery/2FA configured, logo and bio present, demo draft ready; website field checked in actual account |
| Instagram | Same handle preference; professional profile if appropriate | Reels discovery, saveable schedule carousels, Stories reminders | Bio/profile link tested on mobile; three launch assets ready; recovery configured |
| Reddit | Transparent founder account, e.g. `u/HomeSportsFounder` if available | Feedback and relevant community participation | Founder relationship disclosed; current community rules reviewed; no fabricated participation or vote requests |

Use a founder-controlled business email. Store credentials in a password manager, not in the repository. Account creation needs the owner’s verification steps; do not assume a handle is reserved. TikTok bio-link capabilities depend on account eligibility; official materials differ by account status. Verify the actual website field before writing “link in bio.” [Account types](https://support.tiktok.com/en/using-tiktok/growing-your-audience/switching-to-a-creator-or-business-account) · [Account entitlements](https://ads.tiktok.com/help/article/about-tiktok-account-entitlements?lang=en)

Short bio draft: **LoL esports, without the tab juggling. Building your Worlds matchday companion.**

Launch bio after QA: **Your Worlds matchday, in one place. Schedules, teams & watch links. ↓**

Keep the HomeSports identity visible; do not imply an official Riot/Worlds account. Use original screen recordings, graphics, voiceover and cleared music. Broadcast highlights and creator clips require rights review; they are not the default asset source.

Reserve the three accounts by September 16. Defer a HomeSports subreddit/Discord server until people actually request a gathering place. Existing communities offer better initial distribution than an empty owned community.

## Where League fans gather

These are **channel candidates**, not confirmed partners or people who want marketing. Rules were reviewed September 13 where linked; recheck before every submission. No private Discord channels were inspected.

| Priority | Community / channel | Evidence and useful angle | Access rule / action |
| --- | --- | --- | --- |
| 1 | [r/leagueoflegends](https://www.reddit.com/r/leagueoflegends/wiki/subredditrules/) | Broad LoL/esports relevance; an [archived calendar discussion](https://www.reddit.com/r/leagueoflegends/comments/1q0gfss/happy_new_year_lcs_is_back_on_jan_24_2026/) documents difficulty finding dates | Review self-promotion rules and modmail a complete draft. Text must be useful without a click. Rules restrict primarily gambling businesses and result spoilers; no disguised casino funnel |
| 1 | [League Discord directory](https://support.discord.com/hc/en-us/articles/360057027314-League-of-Legends-Communities-on-Discord) / [community server](https://discord.com/servers/league-of-legends-417825368062558219) | Existing League communities; potential schedule resource or small tester group | Check each server’s rules and contact staff through designated channels before promotional posting; no unsolicited member DMs |
| 2 | [r/G2eSports](https://www.reddit.com/r/G2eSports/) | A G2-specific next-match resource could fit team discussion; Worlds messaging only after qualification is verified | Explicit moderator approval required for promotional posts; include exact draft and destination |
| 2 | [r/fnatic](https://www.reddit.com/r/fnatic/) | Relevant team content and fan discussion; potential research audience | Rules restrict promotion of owned websites and require relevant participation. Treat as research-only unless moderators explicitly approve a concrete exception |
| 2 | [r/PedroPeepos](https://www.reddit.com/r/PedroPeepos/) | Esports creator community; potential matchday companion | Rule requires prior approval from Caedrel for promotion, even free projects. No cold promotional post; pursue only an appropriate approved contact path |
| 3 | [r/LoLeventVoDs](https://www.reddit.com/r/LoLeventVoDs/) | Candidate for researching catch-up workflows; specialist spoiler-free alternative | Current rules/activity not fully verified in this pass. Do not post or claim a partnership. Prove spoiler behavior before seeking feedback |
| 3 | Small LoL analysts, co-stream communities and local esports clubs | Hypothesis: a reusable schedule helps hosts answer repeated timing questions | Build a list of 10 from recent public Worlds coverage and published business/community contact paths; confirm permission, active audience and relevance individually |

Research signal: the opened December 2025 LCS reminder thread describes missing dates and keeping track manually. It is archived, so it is evidence of a problem, not a place to reply or an active lead. Other 2025 search results suggested timezone/spoiler pain but their full pages could not be fetched; treat those as weaker historical signals. No fresh high-intent individual buyer was confirmed.

Do not post the same launch link across communities, manufacture karma, buy votes, pretend to be a happy user, or hijack live match threads. Keep community contributions useful and disclose founder affiliation.

## Distribution order

1. **Small feedback group:** recruit through authorized existing relationships or approved community channels; learn where the hub is confusing.
2. **Founder-led Reddit/Discord:** one tailored, permitted launch post per approved community. The useful resource is the post’s substance; the link is supporting material.
3. **TikTok and Instagram:** one original video adapted to both; sell the moment of utility through a real screen demonstration.
4. **Small creators:** offer a tested matchday page and attribution link; run only a small agreed trial if the audience fits.
5. **Search:** publish the hub early so discovery can develop; do not depend on ranking for broad “Worlds 2026” within a month.
6. **Paid amplification:** only after landing-page activation is measurable. No general gaming audience blast or follower-buying.

## Content operating system

Default cadence: four short videos/week, two Instagram carousels/week, and matchday Stories after launch. Reuse one underlying schedule/research asset across formats. Reddit and Discord have no posting quota; relevant participation and community permission determine frequency. Allocate roughly 4 hours recording/editing, 3 hours research/community work, 2 hours scheduling and analytics, and 1–3 hours corrections each week.

Content mix: about 60% practical matchday help, 25% format/team context and 15% transparent product demonstrations. Every team, time and advancement claim needs a current source check.

| Publish window | Asset | Hook / substance | CTA and prerequisite |
| --- | --- | --- | --- |
| Sep 16 | Founder intro video | “I’m building the Worlds tab I wanted last year.” Show current app and what is still being built | Ask for feedback; label preview honestly |
| Sep 18 | Matchday guide | “Here’s how to find the series you actually care about.” Use a current verified playoff day | Existing matchboard link |
| Sep 21 | Local-time demo | “Your match time should not need a timezone calculator.” | Preview only until P02 verified |
| Sep 23 | Team-follow demo | Show following one team and opening its next match | P05; explain browser-local follows |
| Sep 25 | Spoiler-control demo | “Watching after work? Here’s what stays hidden.” | P04 must pass; otherwise replace with schedule demo |
| Sep 27 | Beta invitation | Show one real task; request 10–15 testers | Working preview and feedback route |
| Sep 29 | Format carousel | Explain verified 2026 stages without fabricating matchups | Official source link and hub |
| Oct 1 | Before/after task demo | Time how long it takes to find a next match in HomeSports; avoid unsupported competitor claims | Working production flow |
| Oct 4 | QA / founder update | Show a user-reported issue fixed; disclose limitations | Reassure with evidence, no perfection claim |
| Oct 8 | Launch video + permitted Reddit post | “Your Worlds matchday, in one place.” One 20-second real walkthrough | `/worlds` and follow-team action |
| Oct 9–14 | Preparation series | Bookmark hub; confirmed opening schedule; calendar behavior; verified format explainer | One action per post |
| Every Worlds matchday | Morning schedule + optional evening recap | Date/timezone clearly visible. Preview avoids result spoilers; recap is clearly labeled | Matchday hub; published starts may shift |

Video template: 0–2s concrete problem; 2–12s show the solution; 12–20s show next useful action; final frame HomeSports URL. Captions must remain legible on mobile. Test “today’s matches” against “follow your team,” changing one element at a time. Avoid fake urgency, guaranteed results and gambling creatives in the general-audience campaign.

## Drafts ready for adaptation

**Reddit draft — only after QA and community permission**

Title: “I built a free Worlds matchday page with local times and team follows”

Body: “I’m the developer of HomeSports. I wanted a quicker way to see what’s next at Worlds without hopping between schedules and team pages. The page puts local match times, team follows and watch links together. [Add one verified example and a short explanation of the stage view.] It’s free and does not require an account. Team follows currently stay in your browser. Here’s the page: [production URL]. I’d particularly appreciate feedback on finding your team’s next game on mobile. [List any current limitations.]”

**Moderator request draft — unsent**

“Hi, I’m building HomeSports, a free LoL esports matchday site. I’d like to share a useful Worlds schedule post with a clearly disclosed link to my project. Here are the exact draft and destination: [draft] [URL]. Would this fit your rules, and is there a preferred thread or channel? I won’t post it without the required approval.”

**Creator draft — unsent, personalize only from verified context**

“Hi [name], I saw your [specific public Worlds coverage]. I’m building HomeSports to help viewers find their next match and watch link. Would a short preview be useful for your audience? I can share the working page and a schedule card; no obligation to post. [URL]”

**Launch Reel/TikTok script — only claim shipped features**

“Following Worlds? Here’s your matchday in one place. Open HomeSports, see what’s next in your time zone, and follow your team. When the match starts, open the stream from here. It’s free, no signup. [Site URL, or link-in-bio only if functional.]”

## Weekly execution board

| Window | Build | Founder / marketing | Exit condition |
| --- | --- | --- | --- |
| Sep 13–19 | Hub structure, source mapping, timezone behavior | Reserve TT/IG/Reddit, confirm domain/budget, prepare four asset templates, verify six community routes | Account ownership established; hub skeleton and rules ledger |
| Sep 20–27 | Stage view, spoiler work, follows, metadata and analytics | Produce first four videos, prepare mod drafts, recruit testers through permitted routes | Preview available; 10–15 invitations planned/sent by owner with permission |
| Sep 28–Oct 4 | Fix tester issues, outages/mobile tests, share cards if capacity | Prepare launch assets, gather feedback, qualify ten creator candidates | Recorded readiness review and approved distribution slots |
| Oct 5–8 | Deploy stable release; verify production and rollback | Publish profiles/content; submit only approved posts; respond to questions | Public launch complete and tracked |
| Oct 9–14 | Critical fixes and source rechecks | Daily preparation content; review activation; rehearse coverage | Ready for opening day; primary and backup coverage assigned |
| Oct 15–Nov 14 | Monitor data and stage transitions | Practical matchday content; weekly channel review; documented corrections | Reliable service and measurable returning viewers |

## Budget and measurement

**Confirmed planning range: $300–$1,000 for organic plus small creator tests. Proposed base: $700 through Worlds.** The figures below are spending caps to plan against, not verified vendor quotes or committed purchases.

| Budget item | $300 lean plan | $700 base plan | $1,000 ceiling |
| --- | --- | --- | --- |
| Domain/setup reserve | $30 | $40 | $50 |
| Original creative/editing support | $20 | $60 | $100 |
| Small creator tests | $150 | $350 | $500 |
| Amplify a demonstrated winner | $0 | $100 | $150 |
| Reliability/contingency reserve | $100 | $150 | $200 |
| Total | $300 | $700 | $1,000 |

Start with one creator test capped at $100–$150 after the landing page passes QA. Seek a concrete deliverable: an original short demonstration or relevant matchday mention with a tested attribution link. Eligibility: recent LoL/esports coverage, visible audience engagement, suitable general-audience content, and a public professional contact route. Ask for first-party recent performance figures; follower counts alone are insufficient. No creator or price is confirmed.

In the base plan, release the remaining $200–$250 creator allocation only after reviewing the first test’s traffic quality and feedback. The $100 amplification reserve is conditional on a useful organic result and applicable platform ad eligibility; otherwise leave it unspent. Do not exceed $1,000 without a new budget decision. Settle deliverables, dates, disclosure, payment terms and usage rights before payment. Crypto payment is optional for creators; the user’s crypto preference concerns receiving affiliate commissions.

Review each test after seven days or 100 attributable landing sessions, whichever is later within the tournament window. If a small test never reaches that sample, report insufficient evidence; do not assume success from video views. Compare cost per activated session with the founder’s organic channels, collect user feedback, and stop at the agreed cap. No paid gambling campaign is included in this general-audience launch budget.

**North-star:** weekly returning Worlds viewers who perform a useful action. If the current privacy-preserving analytics cannot measure cohorts reliably, report sessions/actions and native return metrics separately; do not label estimates as unique retained people. Any additional identification must be designed with privacy requirements.

| Metric | Definition | Proposed goal / decision |
| --- | --- | --- |
| Activation | Hub session with a follow, calendar action or stream open | Aim for 20% after 100 attributable sessions; diagnose UX if materially below |
| Beta task success | Users completing the four core tasks unassisted | At least 8/10 before broad promotion |
| Early audience | Real hub visitors, excluding internal testing where measurable | Planning target: 100 beta/preview visitors and 500 launch-week visitors, not a forecast |
| Retention | Activated users returning within seven days, only if valid cohort measurement exists | Directional goal 20%; otherwise measure voluntary tester returns and aggregate trends separately |
| Channel efficiency | Attributable activated sessions per hour of content work and per dollar spent | Review weekly; prioritize demonstrated useful traffic over raw views |
| Reliability | Incorrect matchup/score reports, stale-feed incidents, broken watch links | Zero unresolved critical errors at launch; log every incident |

Use campaign `worlds_2026_launch`; sources `tiktok`, `instagram`, `reddit`, `discord`, or an agreed creator identifier; medium `organic_social`, `community`, or `creator`; content identifies the asset. Do not put personal information into UTM values. These parameters are a measurement plan, not evidence that attribution already works.

October 11 review: identify the best two channels. After roughly 200 attributable sessions/channel or two weeks, inspect activation and feedback before expanding. Small samples are directional. Pause any paid test at its agreed budget cap. Do not promise virality or revenue from view counts.

## Matchday operations and risks

- Founder is provisional matchday editor; assign a backup before October 12. Check official schedule before publishing, shortly before play and after reschedules.
- During a source outage, show the last verified timestamp and official-source link. Pause promotional claims that depend on live data; record recovery.
- Europe and North America change clocks on different dates during Worlds. Test timezone conversion across late October/early November; avoid hard-coded UTC offsets.
- Maintain a correction log and respond candidly to public errors. Never silently keep an incorrect scheduled graphic circulating.
- Launch marketing and public site remain for general audiences. Gambling placements, if later introduced, must follow eligibility rules and can affect community acceptance. See [monetization review](monetization-review.md).
- Accounts, paid memberships, betting features and a new community server are not launch dependencies. With limited time, reliable utility is the priority.

## First 72 hours

- [ ] Founder: choose the $300, $700 or $1,000 allocation within the confirmed range, confirm available weekly hours and stable domain; provide the ownership email through a secure account setup flow when needed.
- [ ] Founder: create/reserve TikTok, Instagram and Reddit; verify ownership/recovery; record the final handles without credentials.
- [ ] Build: implement `/worlds` and map official event/stage IDs; show only verified data.
- [ ] Joint: review current playoffs on mobile as the rehearsal for Worlds coverage.
- [ ] Founder: record a 20-second honest preview and create schedule/story/format templates.
- [ ] Founder: review six community routes and prepare two permission requests with exact drafts; send only when separately authorized.
- [ ] Build: prepare the analytics baseline and core-action events.

## Evidence and limits

Sources linked inline were checked September 13, 2026. This is a plan based on repository inspection and public research, not a live production audit. No traffic dashboard, current audience demographics, final handle availability, creator rates, community approvals or current qualified team list was verified. Community listings establish fit, not demand or permission. Historical pain signals justify testing, not a claim of current intent.

The separate [community evidence report](../outputs/worlds-community-research.html) distinguishes observed demand from speculative channel fit. All dates, policies and features must be rechecked at execution. No external accounts, messages, promotions, payments or ad campaigns were created by this task.
