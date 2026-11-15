# Twitch Extension hosted-test and review guide

## Build the CDN asset bundle

```bash
PICK_PREDICT_EBS_ORIGIN=https://YOUR_REVIEWED_BACKEND npm run extension:package
```

Upload `dist/pick-predict-twitch-extension.zip` on the **Files** tab of the Twitch Extensions Manager.

## Asset Hosting paths

- Type: Video - Fullscreen and Panel
- Viewer Path: `panel.html`
- Video - Fullscreen View Path: `video.html`
- Config Path: `config.html`
- Live Config Path: `config.html`
- Panel Height: `496`

## Capabilities

- Request Identity Link: `No` (stable opaque Twitch identities are sufficient)
- Chat Capabilities: `No`
- Configuration: Extension Configuration Service is not required; configuration is stored in the Pick Predict backend.
- URL Fetching Allowlist: the exact reviewed EBS origin used when packaging.

## Backend environment

Add the base64 secret from the Extension Manager to the EBS:

```text
TWITCH_EXTENSION_SECRET=<base64 Extension secret>
TWITCH_EXTENSION_CLIENT_ID=<Extension client ID>
PICK_PREDICT_PUBLIC_ORIGIN=https://YOUR_REVIEWED_BACKEND
```

The ZIP embeds `PICK_PREDICT_EBS_ORIGIN` supplied at packaging time. It does not deploy the backend. This implementation rejects serverless production until shared transactional storage exists. Read [production readiness](production-readiness.md) before deciding the hosting route. Do not deploy or upload just to bypass that guard.

## Reviewer walkthrough

1. Open the Extension configuration page as the broadcaster.
2. Create a series with blue/red team names, best-of format, voting window, and broadcast reveal delay.
3. Start the draft.
4. Open the channel as a test viewer. In the panel or video overlay, search for and select a champion.
5. In the configuration page or external producer dashboard, confirm the champion lock-in.
6. Verify that the viewer result and score remain hidden until the configured reveal delay passes.
7. Verify that the panel leaderboard updates after the delay.
8. Verify that logged-in Twitch test viewers retain their score after reloading the panel.

No payment, Bits, chat, wagering, or prizes are used. Points have no monetary value.

## Required console assets still supplied manually

The Extensions Manager requires a logo, taskbar icon, discovery image, screenshot, author/support email, review channel URL, and public Terms and Privacy URLs. Use:

- Terms: `https://twitchleagueplugin.vercel.app/terms.html`
- Privacy: `https://twitchleagueplugin.vercel.app/privacy.html`

Replace those example listing links with the reviewed backend's real terms/privacy URLs. Do not submit until authentication, durable hosting, real-client tests, policy review and listing assets are complete. The standalone OAuth application is optional when producers and viewers use only Twitch's signed Extension sessions.
