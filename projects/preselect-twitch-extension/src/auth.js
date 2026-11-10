import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { configuredIds, demoEnabled, isProduction, publicOrigin } from "./runtime-config.js";
import { HttpError } from "./request-guards.js";

const secret = () => process.env.SESSION_SECRET;
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const sign = value => createHmac("sha256", secret()).update(value).digest("base64url");
const pack = value => { const payload = encode(value); return `${payload}.${sign(payload)}`; };
const unpack = token => {
  try {
    const parts = String(token || "").split(".");
    const [payload, signature] = parts;
    if (parts.length !== 2 || !payload || !signature || payload.length > 4096 || !secret()) return null;
    const expected = sign(payload);
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch { return null; }
};
const cookies = req => Object.fromEntries(String(req.headers.cookie || "").split(";").flatMap(part => {
  const index = part.indexOf("=");
  if (index < 1) return [];
  try { return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))]]; } catch { return []; }
}));
const setCookie = (res, name, value, { maxAge = 60 * 60 * 24 * 7 } = {}) => {
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProduction() ? "; Secure" : ""}`;
  const existing = res.getHeader("set-cookie") || [];
  res.setHeader("set-cookie", [...(Array.isArray(existing) ? existing : [existing]), cookie]);
};
export const twitchConfigured = () => Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET && process.env.SESSION_SECRET?.length >= 32);
function moderatorChannels(id) {
  try {
    const mapping = JSON.parse(process.env.TWITCH_MODERATOR_CHANNELS || "{}");
    return Array.isArray(mapping[id]) ? mapping[id].filter(value => typeof value === "string" && /^\d{1,32}$/.test(value)) : [];
  } catch { return []; }
}
export const authFor = req => {
  if (demoEnabled() && !twitchConfigured()) return { configured: false, oauthAvailable: false, authenticated: true, producer: true, role: "demo", user: { displayName: "Demo producer" }, channels: ["demo"] };
  const anonymous = { configured: true, oauthAvailable: twitchConfigured(), authenticated: false, producer: false, role: "viewer", user: null, channels: [] };
  if (!twitchConfigured()) return anonymous;
  const session = unpack(cookies(req).pp_session);
  if (!session || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now() || typeof session.id !== "string" || !/^\d{1,32}$/.test(session.id)) return anonymous;
  const ownChannel = configuredIds("TWITCH_BROADCASTER_IDS").has(session.id);
  const channels = [...new Set([...(ownChannel ? [session.id] : []), ...moderatorChannels(session.id)])];
  const role = ownChannel ? "broadcaster" : channels.length ? "moderator" : "viewer";
  return { configured: true, oauthAvailable: true, authenticated: true, producer: channels.length > 0, role, user: session, channels };
};

function callbackUri() {
  const origin = publicOrigin();
  if (!origin) throw new HttpError(503, "The public authentication origin is not configured.", "authentication_unavailable");
  const expected = `${origin}/api/auth/callback`;
  if (process.env.TWITCH_REDIRECT_URI && process.env.TWITCH_REDIRECT_URI !== expected) throw new HttpError(503, "The OAuth callback must match the configured public origin.", "authentication_unavailable");
  return expected;
}

function safeReturnTo(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/control";
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid" || !["/", "/control", "/automation", "/overlay"].includes(url.pathname)) return "/control";
  const channel = url.searchParams.get("channel");
  return url.pathname + (channel && /^\d{1,32}$/.test(channel) ? `?channel=${channel}` : "");
}

export function beginTwitchAuth(req, res) {
  if (!twitchConfigured()) throw new HttpError(503, "Twitch OAuth is not configured.", "authentication_unavailable");
  const redirectUri = callbackUri();
  const state = randomBytes(24).toString("hex");
  const returnTo = safeReturnTo(new URL(req.url, "https://local.invalid").searchParams.get("returnTo"));
  setCookie(res, "pp_oauth_state", pack({ state, returnTo, expiresAt: Date.now() + 10 * 60 * 1000 }), { maxAge: 600 });
  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.search = new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, redirect_uri: redirectUri, response_type: "code", scope: "", state }).toString();
  res.writeHead(302, { location: url.toString() }); res.end();
}

export async function finishTwitchAuth(req, res, url) {
  if (!twitchConfigured()) throw new HttpError(503, "Twitch OAuth is not configured.", "authentication_unavailable");
  const saved = unpack(cookies(req).pp_oauth_state);
  if (!saved || !Number.isFinite(saved.expiresAt) || saved.expiresAt < Date.now() || typeof saved.state !== "string" || saved.state !== url.searchParams.get("state")) throw new HttpError(401, "OAuth state did not match.", "invalid_oauth_state");
  setCookie(res, "pp_oauth_state", "", { maxAge: 0 });
  if (url.searchParams.get("error")) throw new HttpError(401, "Twitch authorization was declined.", "authorization_declined");
  if (!url.searchParams.get("code")) throw new HttpError(400, "Missing OAuth authorization code.");
  const redirectUri = callbackUri();
  const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(8000),
    body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, client_secret: process.env.TWITCH_CLIENT_SECRET, code: url.searchParams.get("code"), grant_type: "authorization_code", redirect_uri: redirectUri })
  });
  if (!tokenResponse.ok) throw new Error("Twitch token exchange failed.");
  const token = await tokenResponse.json();
  const userResponse = await fetch("https://api.twitch.tv/helix/users", { signal: AbortSignal.timeout(8000), headers: { "Client-Id": process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token.access_token}` } });
  if (!userResponse.ok) throw new Error("Could not read the Twitch profile.");
  const user = (await userResponse.json()).data?.[0];
  if (!user || !/^\d{1,32}$/.test(user.id)) throw new Error("Twitch returned no user profile.");
  setCookie(res, "pp_session", pack({ id: user.id, login: user.login, displayName: user.display_name, imageUrl: user.profile_image_url, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  setCookie(res, "pp_oauth_state", "", { maxAge: 0 });
  res.writeHead(302, { location: safeReturnTo(saved.returnTo) }); res.end();
}

export function logout(res) {
  setCookie(res, "pp_session", "", { maxAge: 0 });
}
