# HomeSports Worlds 2026 campaign

Prepared October 14, 2026. Campaign copy and creative are ready for account selection; nothing has been posted or scheduled. This execution pack updates the timing of the September launch plan: start now and run through November 15.

## Positioning

**Your Worlds matchday, in one place.**

Lead with the viewer’s immediate need: finding the next match and its watch link. Use daily champion games as the second reason to visit once `/play` is deployed. Send schedule content to `/worlds` and game content to `/play`, rather than sending every post to the homepage.

Primary audience: English-speaking League esports viewers planning when to watch. Secondary audience: League players who enjoy short champion puzzles and may become Worlds viewers. Begin organically with founder posts and original product demos. No ad spend or creator payments are committed.

## Launch status

The provisional campaign URL is https://homesports.vercel.app/worlds, taken from the existing application configuration. It returned HTTP 200 on October 14. Its rendered page includes upcoming matches, official-stream links, team follows, and a Show results control. Local-time conversion is implemented in the source but was not interactively tested in this campaign session.

The public `/play` route returned HTTP 404 on October 14. Keep all game posts on hold until the games are deployed and checked on a phone. The source currently includes three games, daily rotation, browser-local progress, and copied results.

The live hub currently groups provider-labelled “Group Stage” fixtures under “Additional fixtures.” Do not claim complete Swiss standings or complete stage tracking in the launch copy. Promote the schedule and watch links. Do not call the experience entirely spoiler-free: future pairings can reveal progression even with scores hidden.

## Campaign rhythm

| Dates | Message | Deliverable | Destination |
| --- | --- | --- | --- |
| Oct 14 | Set up your Worlds watch routine | Founder launch post, pinned profile post, square launch graphic | `/worlds` |
| Oct 15 | Worlds starts today | Opening-day post and 15-second product walkthrough | `/worlds` |
| Oct 16–18 | Make tomorrow’s match easy to find | One useful schedule or feature post each day | `/worlds` |
| Oct 19–22 | A short League challenge between stages | Game launch post after deployment; one recorded puzzle | `/play` |
| Oct 23–26 and 28–31 | Find your next Swiss match | Matchday reminders using current verified fixtures | `/worlds` |
| Nov 3–6 | Quarterfinal viewing plans | One reminder before the first series each day | `/worlds` |
| Nov 7–8 | Semifinal weekend | One useful viewing post per matchday | `/worlds` |
| Nov 9–13 | Bring your duo back for the final | One game challenge and one final reminder | `/play`, `/worlds` |
| Nov 14 | Final day | Final viewing reminder, no result in the headline | `/worlds` |
| Nov 15 | Keep following after Worlds | Thank-you post and regular-season calendar CTA | `/calendar` |

Dates: [Riot Worlds 2026 primer](https://lolesports.com/en-GB/news/worlds-2026-primer) and [MSI and Worlds updates](https://lolesports.com/en-US/news/msi-and-worlds-updates), checked October 14. Recheck event details before publishing date-sensitive posts. Do not turn provider times for later series into promises of exact starts.

On matchdays, publish a useful reminder 60–90 minutes before the first verified series. On off days, test 17:00 UTC as a starting slot, then adjust using actual clicks. This is a test window, not a claimed optimal posting time. Spend 15 minutes replying to genuine questions after posting. Avoid repeating a link in unrelated conversations.

## Channels and assets

**X:** founder voice, one clear idea, one destination, one original graphic or short demo. Pin the launch post. Use the copy in `posts.json`; each X draft fits 280 characters with a 23-character URL allowance.

**Instagram and TikTok:** use the 15-second recording script below. Add captions and show the actual product. Put the campaign URL in the profile only where the account supports it; use “link in bio” only after that link is configured. The supplied portrait graphic can be used as a cover, not as a claim that a video has been produced.

**Reddit:** use the complete founder-disclosed draft below as a single useful feedback post in a relevant community that permits it. Choose the community and read its current rules before submitting; no destination or moderator permission has been established. Do not syndicate identical posts across subreddits.

The two graphics use HomeSports colors and original typography. Upload the supplied PNG files; editable SVG sources are included. Both PNG exports were visually reviewed. They contain no player photos, official tournament logo, or implied endorsement. The images omit the provisional domain so a later domain change does not require remaking them. Alt text: “HomeSports. Your Worlds matchday, in one place. Find your next match. Open the official stream. Worlds 2026. Independent fan project.”

## Launch post

Worlds starts tomorrow. I built HomeSports to make the next match and its official stream easier to find.

Free, no signup. Bookmark your Worlds hub:
https://homesports.vercel.app/worlds?utm_source=x&utm_medium=organic_social&utm_campaign=worlds_2026&utm_content=launch

What would make this more useful for you?

Publish this wording on October 14 only. Use the date-neutral pinned copy in `posts.json` if posting later.

## Reddit draft

**Title:** I built a free Worlds match hub and would love feedback from people watching this year

I’m building HomeSports, a small independent League esports site. For Worlds, I wanted one page where I could find the next match and open the official stream.

Here’s the tournament calendar for anyone planning around work or school:

- Play-In: October 15–18
- Swiss: October 23–26 and October 28–31
- Quarterfinals: November 3–6
- Semifinals: November 7–8
- Final: November 14

Source: https://lolesports.com/en-GB/news/worlds-2026-primer

My hub is free and doesn’t require an account:
https://homesports.vercel.app/worlds?utm_source=reddit&utm_medium=community&utm_campaign=worlds_2026&utm_content=founder_launch

It includes provider-published fixtures and official-stream links. Results are hidden by default behind a Show results control. Unannounced opponents stay TBD; I’m still improving how the provider’s stage labels appear.

If you try it, what is the first thing you need on a Worlds page that you can’t find here? I’m the developer, so specific usability feedback is especially useful.

## Short video script

Record the public hub after checking that the fixtures and destinations are correct. Hide personal browser tabs and keep results hidden.

| Time | Screen | Voiceover and captions |
| --- | --- | --- |
| 0–3 seconds | Worlds hub title and next match | “Watching Worlds? Here’s a quick way to find your next match.” |
| 3–8 seconds | Next match card, date and time visible | “I built HomeSports to keep the schedule in one place.” |
| 8–12 seconds | Point to the official stream link without starting a broadcast | “Find the series, then open the official stream.” |
| 12–15 seconds | Original portrait cover | “Free. No signup. HomeSports.” |

Caption: “Your Worlds matchday, in one place. I’m building HomeSports for fans who want the next match and watch link without hunting through tabs. What should I improve next? #Worlds2026 #LeagueOfLegends”

Once games are live, record a separate demo: “Can you name the champion before the next clue?” Show only the first clue, pause, and invite viewers to play. Do not put the answer in the cover or pretend that fabricated scores came from users.

## Measurement

Use `utm_campaign=worlds_2026` throughout. The source identifies the platform; the content value identifies the post. Existing Vercel analytics events include `Stream Opened`, team follows, calendar actions, and the new game-completion events. Verify campaign filtering in the actual analytics account before claiming an attributed conversion rate.

Review after three days and weekly thereafter. Record post URL, impressions, platform link clicks, landing-page visits if available, and relevant product actions. Treat platform impressions and site actions as separate aggregates unless the analytics tool actually supports joining them.

Initial experiment targets, not forecasts: 100 campaign visits in the first seven days and 10 useful product actions. Compare posts on link clicks per impression; compare game completion only among game starts once that denominator is instrumented. Repeat the strongest useful angle. If a post gets reach but few clicks, improve its offer; if it gets clicks but people cannot complete the action, fix the destination before increasing promotion.

## Next publishing steps

1. Select the owned accounts and confirm whether the provisional website URL is the preferred public URL.
2. Publish and pin the launch post; upload `assets/launch-square.png`. Record the resulting post URL.
3. Record and publish the 15-second product demo on the chosen short-video accounts.
4. Publish one community feedback post only after reviewing the destination’s current rules.
5. Deploy and verify `/play`, then release the held game posts.

No social publishing connection is available in this session. No external posts, DMs, campaigns, account creation, or scheduled jobs were performed.
