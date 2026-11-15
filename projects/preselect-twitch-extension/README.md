# Pick Predict

Pick Predict is a live esports draft prediction game for League of Legends co-streams and watch parties. A producer runs the professional pick/ban sequence while viewers predict each lock-in and compete on game and series leaderboards.

## Run locally

Requires Node.js 20 or newer. There are no runtime dependencies.

```bash
npm run demo
```

Then open:

- Viewer experience: <http://localhost:4173>
- Producer dashboard: <http://localhost:4173/control>

Open the viewer page in multiple browsers or private windows to simulate independent viewers.

Demo access is now explicit and local-only. `npm start` does not silently grant producer access when Twitch configuration is absent. `PICK_PREDICT_DEMO=true` is ignored in production and on Vercel. Copy settings from `.env.example` into your process environment; this dependency-free server does not automatically read `.env` files.

Read [the safety and readiness review](docs/production-readiness.md) before hosting this version. It is not a completed Twitch release. Vercel/serverless requests deliberately fail closed until shared transactional storage is implemented.

## Test

```bash
npm test
```

## Included

- Full 20-action professional pick/ban sequence
- Match, team, best-of, game, and series setup
- Server-authoritative voting deadlines
- Editable predictions until voting closes
- Pick and ban scoring, rarity bonuses, and streak bonuses
- Game and series leaderboards
- Producer controls for resolving, cancelling, undoing, and resetting actions
- Live multi-browser synchronization using server-sent events with polling fallback
- Responsive viewer and producer interfaces

### Milestone 2

- Twitch OAuth authorization-code flow for producer identity
- Broadcaster and moderator allowlists
- OBS browser-source overlay at `/overlay`
- Broadcast-delay calibration that withholds results **and score changes**
- Local automatic state recovery plus recovery snapshot export/import
- Standard, rapid, analyst-desk, and international match templates
- Live vote distribution for the co-stream overlay

### Milestone 3

- Twitch video-overlay, panel, and broadcaster configuration entry points
- Verified Twitch Extension JWTs using the base64 Extension secret
- Persistent `U-` opaque Twitch viewer identities and temporary anonymous identities
- Channel-isolated drafts, predictions, and leaderboards
- Mobile panel layout within Twitch's 318×496 panel dimensions
- Identity-sharing prompt for anonymous viewers
- CSP-compatible, dependency-free Twitch CDN asset bundle
- Hosted-test packaging command and reviewer walkthrough
- Public Terms and Privacy pages

### Milestone 4

- Local browser-window capture using the Screen Capture API
- Calibrated champion portrait crop with reusable browser calibration
- Data Dragon 16.18.1 champion portrait recognition
- Stable multi-frame proposals with configurable confidence threshold
- Mandatory moderator confirmation before resolving predictions
- Experimental on-device broadcast OCR when `TextDetector` is available
- Optional licensed esports-data adapter for automatic live match metadata
- Automation audit log and provider status

Open `/automation` from the producer dashboard. Broadcast frames are processed locally and are not uploaded.

To connect a licensed match-data feed, configure an endpoint returning a JSON `matches` array:

```text
ESPORTS_DATA_URL=https://provider.example/live-matches
ESPORTS_DATA_TOKEN=optional-bearer-token
```

Build the uploadable Twitch asset package with:

```bash
PICK_PREDICT_EBS_ORIGIN=https://YOUR_REVIEWED_BACKEND npm run extension:package
```

See [`docs/twitch-extension-review.md`](docs/twitch-extension-review.md) for console settings and the reviewer walkthrough.

## Twitch OAuth configuration

Create a Twitch application and register this callback URL:

```text
https://YOUR_DOMAIN/api/auth/callback
```

Configure these environment variables:

```text
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_REDIRECT_URI=https://YOUR_DOMAIN/api/auth/callback
SESSION_SECRET=a-long-random-secret
TWITCH_BROADCASTER_IDS=123456
TWITCH_MODERATOR_CHANNELS={"234567":["123456"]}
TWITCH_EXTENSION_SECRET=base64-extension-secret
TWITCH_EXTENSION_CLIENT_ID=extension-client-id
PICK_PREDICT_PUBLIC_ORIGIN=https://YOUR_DOMAIN
```

`TWITCH_MODERATOR_IDS` is no longer used as a global authorization grant. Use `TWITCH_MODERATOR_CHANNELS` to name each moderator's allowed channels. Standalone links preserve a numeric `?channel=` selector through navigation, sign-in, state requests, OBS, and recovery. Invalid or unauthorized selectors fail closed.

The Twitch config view supports manual champion confirmation, cancellation and undo. Every producer mutation includes the last displayed control revision; predictions, confirmation and cancellation also name the round. Stale or repeated actions receive HTTP 409 and must be reviewed after refreshing, not automatically replayed. Logged-out Twitch viewers can watch but must sign in to participate. Stable opaque `U` identifiers suffice; identity-link permission is not requested.

## Prototype deployment note

Local Node deployments recover state from `.data/pick-predict.json`. File writes use a temporary file, file sync and atomic replacement, guarded by an exclusive process lock. API mutations are serialized and rolled back in memory if saving fails. A corrupt/unsupported snapshot blocks the service rather than being overwritten. An interrupted process may leave a lock; verify that process has stopped before an operator clears it.

Production requires an explicit HTTPS origin and an absolute data path on a persistent volume, with exactly one Node process. This is a limited single-instance option, not a distributed storage solution or a load-tested broadcast service. Vercel/serverless mode returns HTTP 503 rather than accepting votes into disposable memory. `/api/health` reports readiness without credentials.

Run `npm test` for engine, authorization, channel isolation, request limits, frontend contracts, packaging, persistence and local restart tests. They use synthetic identities and local storage, not real Twitch accounts or provider calls.
