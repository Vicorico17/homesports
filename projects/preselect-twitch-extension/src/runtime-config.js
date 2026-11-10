import { isAbsolute } from "node:path";

export const isProduction = () => process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
export const demoEnabled = () => !isProduction() && process.env.PICK_PREDICT_DEMO === "true";
export const configuredIds = name => new Set(String(process.env[name] || "").split(",").map(value => value.trim()).filter(value => /^\d{1,32}$/.test(value)));
export function validExtensionSecret(secret = process.env.TWITCH_EXTENSION_SECRET) {
  return typeof secret === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(secret) && Buffer.from(secret, "base64").length >= 32 && Buffer.from(secret, "base64").toString("base64").replace(/=+$/, "") === secret.replace(/=+$/, "");
}

export function publicOrigin() {
  const value = process.env.PICK_PREDICT_PUBLIC_ORIGIN || (!isProduction() ? "http://localhost:4173" : "");
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol === "https:" || (!isProduction() && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return url.origin;
  } catch { /* Invalid configuration is deliberately unusable. */ }
  return null;
}

export function allowedOrigins() {
  const values = [publicOrigin()];
  const clientId = process.env.TWITCH_EXTENSION_CLIENT_ID;
  if (clientId && /^[a-z0-9]+$/i.test(clientId)) values.push(`https://${clientId.toLowerCase()}.ext-twitch.tv`);
  // Extra origins are a local testing option, never a production wildcard.
  if (!isProduction()) values.push(...String(process.env.EXTENSION_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()));
  return new Set(values.filter(Boolean));
}

export function productionBlockers() {
  if (!isProduction()) return [];
  const blockers = [];
  if (!publicOrigin()) blockers.push("A valid HTTPS PICK_PREDICT_PUBLIC_ORIGIN is required.");
  if (process.env.VERCEL) blockers.push("Serverless production is disabled until a shared transactional storage adapter is configured.");
  else if (!process.env.PICK_PREDICT_DATA_FILE || !isAbsolute(process.env.PICK_PREDICT_DATA_FILE)) blockers.push("Production requires an absolute PICK_PREDICT_DATA_FILE on a persistent volume, with exactly one server process.");
  if (!validExtensionSecret() && !(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET && process.env.SESSION_SECRET?.length >= 32)) blockers.push("Twitch authentication is not configured.");
  if (process.env.TWITCH_EXTENSION_SECRET && !validExtensionSecret()) blockers.push("The Extension secret is not valid base64 key material.");
  if (process.env.TWITCH_EXTENSION_SECRET && !/^[a-z0-9]+$/i.test(process.env.TWITCH_EXTENSION_CLIENT_ID || "")) blockers.push("TWITCH_EXTENSION_CLIENT_ID is required for the exact Twitch CDN origin.");
  if (process.env.TWITCH_CHANNEL_IDS && process.env.TWITCH_CHANNEL_IDS.split(",").some(value => !/^\d{1,32}$/.test(value.trim()))) blockers.push("TWITCH_CHANNEL_IDS must contain only comma-separated numeric channel IDs.");
  return blockers;
}
