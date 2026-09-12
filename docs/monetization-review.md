# HomeSports monetization review

Research date: 12 September 2026. Scope: repository review and public program documentation, not a production analytics, legal, or visual audit. No applications submitted, partners contacted, or advertisements enabled.

Confirmed publisher direction: HomeSports remains accessible to everyone. Only gambling advertising is intended for eligible adults in permitted locations; the core site will not have an adult-only gate. Crypto is a preference for receiving affiliate commissions, not a requirement to promote crypto products or connect visitor wallets. Business country and initial advertising markets remain unspecified.

## Recommendation

Build HomeSports as a useful esports publisher with measurable returning traffic. Test one relevant affiliate placement once eligible. Crypto commission settlement is feasible; it does not require visitors to connect wallets or HomeSports to handle wagers. Prefer an esports sportsbook placement over unrelated casino promotions as an audience-fit hypothesis to validate, not an established conversion result.

Run two commercial tracks: qualify crypto-paying betting affiliates for eligible adult markets, and qualify gaming hardware affiliates for a broader audience. Do not forecast income or select a gambling operator until audience countries, operating entity, age policy, and actual traffic are known.

## Shortlist

| Candidate | Verified public offering | Assessment / outstanding checks |
| --- | --- | --- |
| Cloudbet | Current English FAQ lists 25% default net gaming revenue share, Bitcoin-only affiliate payouts, monthly withdrawals, a 0.0001 BTC withdrawal minimum, and five active customers within three months for the first revenue-share payment. | Strongest documented BTC settlement candidate. Obtain the precise active-customer definition, accepted publisher/user countries, NGR deductions, negative carryover, attribution and inactivity rules before applying. |
| Stake.com | Public overview lists crypto and local currency commissions; default 10% commission applied to product-specific formulas. Sportsbook formula is `(0.03 × wagered / 2) × commission rate`. | Candidate subject to country and publisher approval. This is not 10% of deposits or wagers. Its affiliate terms restrict traffic territories, promotion channels, minors, and VPN encouragement. |
| Razer | Official site offers commissions from referred product sales using website links/banners. | Relevant non-gambling alternative. Confirm regional network, commission schedule, cookie window, returns, and payout currency; crypto settlement was not verified. |

Sources: [Cloudbet FAQ](https://www.cloudbet.com/en/affiliates/faq), [Stake overview](https://stake.com/affiliate/overview), [Stake affiliate terms](https://stake.com/policies/affiliate-terms), [Razer affiliates](https://www.razer.com/affiliate).

Cloudbet source conflict: an older official PDF describes 30% revenue share and anytime withdrawals; the current FAQ describes 25% default and monthly withdrawals. Use signed current terms, not the PDF or an affiliate-directory headline. No operator in this shortlist has been established as eligible for HomeSports or its eventual audience.

## Publisher and data constraints

Riot's developer monetization policy prohibits betting/gambling functionality and requires Approved or Acknowledged registration for monetization within that ecosystem. HomeSports currently obtains data through PandaScore and Leaguepedia, so the precise application of Riot's developer policies and IP permissions to this implementation needs clarification. External sponsored referral links and on-site betting are distinct proposals; do not assume either that all advertising is prohibited or that third-party data automatically exempts this site.

Riot's June 2025 betting sponsorship announcement concerns Tier 1 LoL/VALORANT teams in Americas and EMEA, with vetted partners. It is not a general approval for independent affiliate publishers.

PandaScore's published terms section 2.8 prohibits developing or commercializing odds or odds-related products using its subscription data. The repo's separately sourced odds integration does not by itself establish that the combined commercial use is covered. Clarify the exact subscription and proposed display/referral use with the provider.

Sources: [Riot developer policy](https://developer.riotgames.com/policies/general), [Riot team sponsorship announcement](https://www.riotgames.com/en/news/esports-betting-sponsorships), [PandaScore terms](https://www.pandascore.co/terms-and-condition).

Country-specific gambling advertising, publisher licensing/registration, disclosures, and tracking requirements remain unassessed because target countries and operating entity are unknown. An operator's offshore license or willingness to accept crypto does not establish permission to promote it in a particular market. Obtain jurisdiction-specific review before a gambling launch.

## Repository findings

| Area | Observed state | Commercial priority |
| --- | --- | --- |
| Core audience proposition | LoL schedules, importance rankings, live streams, teams, competitions and calendars. | Keep the useful match experience central; test contextual sponsorship. |
| Data trust | Source-health labels and demo fallback exist. Bracket fixes are local and lack production visual verification. | Verify current LCK/LEC desktop/mobile pages and monitor stale data before paid acquisition. |
| Analytics | Vercel Analytics is rendered; stream opens, team follows, calendars and competition opens have instrumentation. | Inspect production reports; no visitor counts, countries, retention, or revenue were available in this review. |
| SEO | Root canonical points to `/`; inspected team/competition routes have no route-specific metadata. Sitemap includes only five static paths. | Add accurate self-canonicals, distinct titles/descriptions, and discoverable team/competition URLs; inspect rendered metadata. |
| Affiliate plumbing | No partner registry, approved links, attribution reconciliation, or offer tracking. | Build only against the selected program's verified link/sub-ID contract. |
| Odds | Environment-controlled integration exists and is disabled by default per README. | Resolve provider/product permissions before enabling commercially. |
| Publisher identity | Privacy and GitHub support link exist; no dedicated advertiser/media-kit page or affiliate disclosure route found. | Add business contact, publisher identity, disclosure, and real audience figures. |
| Accounts / paid tier | Accounts deliberately disabled pending server sessions and data controls. | Affiliate MVP does not depend on login; defer a subscription checkout until paid value is validated. |
| Gambling eligibility | No territory/age-specific offer delivery infrastructure found. | Specify market eligibility before implementing or publishing gambling placements. |

## First placement and measurement plan

Start with one clearly marked sponsored module on a competition page, separate from rankings and match results. For gambling, limit delivery to confirmed eligible adult audiences and approved markets under the applicable rules; a generic age checkbox is not proof of compliance. Avoid placements on academy/youth content. Use a relevant hardware offer for other audiences if separately approved.

Implementation specification:

- Partner registry: partner ID, category, approved destination, enabled status, country allowlist, eligibility requirements, offer expiry, disclosure, and approved copy.
- Server-controlled eligibility with gambling offers absent when eligibility is unknown; prevent shared caching from exposing one market's offers to another.
- Outbound links use `rel="sponsored noopener"`; any redirect resolves only allowlisted destinations and rechecks eligibility.
- Record aggregate offer impressions and clicks with partner, placement and competition identifiers. Do not encode email addresses or wallet addresses in tracking IDs.
- Use the partner-supported sub-ID and reporting/postback mechanism to reconcile approved conversions and paid commission. Authenticate callbacks and deduplicate events if supported. Browser clicks alone do not establish revenue.
- Keep affiliate scripts and consent behavior aligned with the selected markets and update the privacy notice for the actual implementation.
- Include a global disable switch and offer expiration handling.

## Economics

Use actual reported conversions, not a headline commission percentage.

CPA revenue = eligible sessions × offer CTR × approved conversion rate × agreed CPA.

Illustrative arithmetic only: 10,000 eligible sessions × 2% CTR × 3% approved conversion × $75 CPA = $450 gross. Neither the conversion assumptions nor a $75 CPA offer has been verified. Subtract data, hosting, content, acquisition and operating costs; commissions may be rejected or delayed.

At Stake's published default sportsbook formula, $100,000 qualifying wager turnover would calculate to $150 commission: `100000 × 0.03 / 2 × 0.10`. This is an explanation of its formula, not a forecast or encouragement to increase user wagering. Cloudbet revenue share uses contract-defined NGR, with deductions and potentially adverse periods to understand.

For crypto settlement, agree the exact asset/network, denomination at accrual versus settlement, fees, payout threshold and business verification requirements. Keep a payout ledger and fiat valuations for accounting. No wallet setup is needed for this review.

## Ordered execution

1. Establish business country, audience countries, adult eligibility policy, last-30-day sessions, and returning-user baseline.
2. Finish production data/layout verification and address search metadata gaps.
3. Prepare a media kit with verified traffic, inventory screenshots, audience profile and business contact. Do not invent audience demographics.
4. Obtain product/data-use clarification and country-specific eligibility advice for the concrete proposed placement.
5. Seek written terms from Cloudbet and Stake; qualify Razer in parallel as the non-gambling option. Applications and outreach require user authorization and business details.
6. Implement one approved placement and attribution flow, then run a measured pilot. Compare commission actually paid, eligible-session revenue, click-through, retention and complaints. Expand only after the first payment and a useful signal.

## Unsent partner inquiry draft

HomeSports is a League of Legends esports schedule and competition publisher. We are evaluating one clearly disclosed affiliate placement for eligible adult visitors in [countries]. Our last-30-day traffic is [verified sessions] and our operating entity is [entity/country].

Do you accept this publisher type and these traffic markets? Please provide your current publisher terms, permitted placements, CPA/revenue-share options, NGR deductions and negative-carryover rules, qualifying-customer definition, attribution window and sub-ID/reporting support, minimum activity requirements, and crypto payout assets/networks, thresholds and verification requirements. We can share a placement mockup for review before launch.
