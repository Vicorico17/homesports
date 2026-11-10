# Preselect / Pick Predict readiness review

Updated 2026-11-10. These changes are prepared for code and local review; they are not proof of Twitch Hosted Test, approval, or a production release.

## Completed in this implementation

- Production no longer grants demo producer access when credentials are missing. Demo mode must be explicitly requested locally and cannot activate in production or on Vercel.
- Extension JWTs validate signatures, expiration, activation time, numeric channel identity, opaque viewer identity and viewer/broadcaster/moderator roles. Invalid supplied tokens do not fall back to cookies. EBS `external` tokens cannot act as viewer sessions.
- Extension channel identity is authoritative. Standalone moderators have an explicit moderator-to-channel mapping. Cookie-authenticated mutations require the configured same origin. Logout is POST-only. OAuth redirect origin is configured, never taken from the Host header; safe return routes preserve the selected channel.
- Only the configured Extension's CDN origin receives cross-origin access. `TWITCH_EXTENSION_CLIENT_ID` is separate from the optional standalone OAuth app ID.
- Raw caller-supplied viewer IDs are development-only. Anonymous `A` tokens can read but cannot persist predictions or identities. Twitch sign-in yields a stable opaque identity; identity sharing is not needed.
- Producer commands use an expected control revision; vote/resolve/cancel commands also name the round. Concurrent duplicate lock-ins commit only once. Stale requests return 409 without automatic replay.
- Twitch's broadcaster config now includes champion confirmation, cancellation, undo, draft history and next-game controls. Mutations are protected against double submission and destructive actions have confirmation prompts. Polling coalesces, respects hidden tabs and waits for hosted Twitch authorization.
- Standalone viewer, producer, automation, OBS and recovery routes preserve the chosen channel. The unconfigured waiting lobby renders without trying to create a viewer prematurely.
- Requests have bounded JSON bodies and per-process limits. Ordinary bodies are at most 64 KiB, recovery imports at most 4 MiB. State is capped at 100 channels and 5,000 viewers per channel; public leaderboards return the first 100 entries while the caller's own score remains available.
- File persistence uses exclusive ownership, file sync and atomic replacement. Mutations are serialized; reads wait until persistence completes. Save failures roll back state, and notifications/cleanup cannot convert a committed write into a false failure. Malformed recovery files fail closed. No automatic deletion or recovery reset is performed.
- Packaging requires an explicit reviewed HTTPS backend origin instead of silently shipping a hardcoded destination. Building the ZIP does not deploy a backend or upload to Twitch.
- The main repository CI now runs the nested Twitch tests as well as HomeSports checks.

## Hosting boundary

**Vercel/serverless is intentionally unavailable.** No shared database adapter was provisioned or implemented. Until one exists, production APIs return 503 there, even if Twitch secrets are present. Shipping this branch must not be mistaken for a serverless launch.

A single Node process can use an explicitly configured persistent disk. The exclusive lock prevents two processes from accidentally sharing the file. A hard crash can leave a lock behind; an operator must verify the prior process is no longer running before removing it. File storage requires backups, restore practice, filesystem durability checks, monitoring and load testing. Whole-snapshot writes are a limited beta design, not a scaling solution for large channels.

For a scalable EBS, implement a transactional shared store with channel isolation, revision comparisons and idempotency at the database boundary. Shared rate limiting, retention/deletion workflows and live fan-out are still needed. Do not bypass the serverless readiness guard to make a preview appear healthy.

## Twitch requirements and review sequence

1. Obtain the owner's approval for application/Extension configuration and any credentials. No actual application, secret, grant, console setting or payment was created by this work.
2. Configure the reviewed backend origin, Extension ID, secret and exact URL-fetching allowlist. Optionally restrict the beta with `TWITCH_CHANNEL_IDS`. Configure separate OAuth settings only if the standalone producer/viewer flow is required.
3. Build the frontend with `PICK_PREDICT_EBS_ORIGIN`. Configure panel, fullscreen video, configuration and live-configuration paths. `config.html` can serve both configuration and live producer controls.
4. Run Twitch Local Test with broadcaster, same-channel moderator, logged-in unlinked viewer and anonymous viewer. Check wrong-channel tokens, expired/revoked identity, interruptions and repeated clicks. Real Twitch behavior has not been exercised by these synthetic tests.
5. Upload to Twitch Hosted Test only after backend readiness, approval and domain checks. Verify CDN CSP, mobile panel dimensions, portrait/landscape, latency, score/reveal delay, reconnection and two independent channels.
6. Supply final branding/screenshots, support contact, privacy/terms, reviewer walkthrough and a usable review channel. Complete policy review and Twitch submission separately. A ZIP is not approval or release.

Twitch's current documentation establishes signed Extension identities and roles, separates Local Test, Hosted Test and review, requires the Helper as the first script and explicit fetched-URL disclosure, and requires terms/privacy and listing assets:
- https://dev.twitch.tv/docs/extensions/reference/
- https://dev.twitch.tv/docs/extensions/life-cycle/
- https://dev.twitch.tv/docs/extensions/guidelines-and-policies/

## Still unfinished

- Shared transactional storage and distributed limits/fan-out for Vercel or multiple EBS instances.
- Real-account Twitch Local/Hosted Test and real-browser visual/mobile verification.
- Proven broadcast recognition accuracy and patch coverage. Automation remains supervised: the moderator confirms every detected lock-in. It does not supply licensed professional draft telemetry.
- Data/broadcast rights, Riot policy review and final privacy/support/retention/deletion procedures.
- Operational backups, restore drills, capacity tests and production alerting.

Earlier snapshots with anonymous identities or malformed state are rejected, not automatically migrated or erased. Review existing data and plan a controlled migration before upgrading a live installation. No existing production data was inspected or changed here.

## Verification performed

The final local suite passes 56 tests. It covers production auth failure, wrong-channel/role denial, anonymous participation limits, CSRF/CORS, duplicate concurrent resolution, stale revisions, hidden reveal scores, write rollback, body/rate limits, corrupt snapshots, storage locks, client routing/polling contracts, packaging safeguards and full local HTTP play/restart recovery. JavaScript syntax checks and whitespace checks pass. Tests use synthetic tokens and temporary local files; no real Twitch login, credential generation, provider access, upload or production deployment occurred.

Real-browser/Twitch-hosted visual testing remains outstanding. The earlier cloud browser could not reach this workspace's local HTTP server, so local HTTP/contract tests must not be presented as a real-device validation.
