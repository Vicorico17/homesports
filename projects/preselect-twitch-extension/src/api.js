import { DraftEngine } from "./draft-engine.js";
import { authFor, beginTwitchAuth, finishTwitchAuth, logout } from "./auth.js";
import { createFilePersistence } from "./persistence.js";
import { verifyExtensionJwt } from "./extension-auth.js";
import { championCatalog, liveEsportsMatches } from "./automation-data.js";
import { configuredIds, demoEnabled, productionBlockers } from "./runtime-config.js";
import { identity } from "./snapshot-validation.js";
import { applyCors, applySecurityHeaders, createRateLimiter, HttpError, readJsonBody, requireSameOrigin } from "./request-guards.js";

const MAX_CHANNELS = 100;
const producerActions = {
  "match/create": (engine, data) => engine.createMatch(data),
  "match/configure": (engine, data) => engine.configure(data),
  "series/clear": engine => engine.clearSeries(),
  "draft/start": engine => engine.startDraft(),
  "draft/new-game": engine => engine.newGame(),
  "draft/resolve": (engine, data) => engine.resolve(data.champion),
  "draft/cancel": engine => engine.cancelRound(),
  "draft/undo": engine => engine.undoLast(),
  "draft/reset": engine => engine.resetGame(),
  "recovery/import": (engine, data) => engine.restore(data.snapshot),
};
const sendJson = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
};

export function requestContext(req, url) {
  const auth = authFor(req);
  const extension = verifyExtensionJwt(req); // Invalid supplied tokens never fall back to cookies/demo.
  if (url.searchParams.getAll("channel").length > 1) throw new HttpError(400, "Specify one channel.");
  const requested = url.searchParams.get("channel");
  if (requested && !/^\d{1,32}$/.test(requested) && !(demoEnabled() && requested === "demo")) throw new HttpError(400, "Invalid channel identifier.");
  if (extension && requested && extension.channel_id !== requested) throw new HttpError(403, "Token does not belong to this channel.", "channel_mismatch");
  const channelId = extension?.channel_id || requested || auth.channels[0] || (demoEnabled() ? "demo" : null);
  if (!channelId) throw new HttpError(400, "A channel or authenticated Twitch session is required.", "channel_required");
  const allowed = configuredIds("TWITCH_CHANNEL_IDS");
  if (allowed.size && !allowed.has(channelId) && channelId !== "demo") throw new HttpError(403, "This channel is not enabled for the beta.", "channel_not_enabled");
  const localViewer = req.headers["x-viewer-id"] || url.searchParams.get("viewerId");
  const viewerId = extension?.opaque_user_id || (auth.authenticated && auth.user?.id ? `oauth:${auth.user.id}` : demoEnabled() && channelId === "demo" && identity(localViewer) ? localViewer : null);
  return {
    auth, extension, channelId, viewerId,
    producer: extension ? ["broadcaster", "moderator"].includes(extension.role) : auth.producer && auth.channels.includes(channelId),
  };
}

export function createApi({ persistence = createFilePersistence(), now = Date.now, rateLimit = createRateLimiter({ now }) } = {}) {
  const engines = new Map();
  const clients = new Map();
  let initialization;
  let writes = Promise.resolve();
  let pendingWrites = 0;
  const allSnapshots = () => ({ version: 3, savedAt: now(), channels: [...engines].map(([id, engine]) => [id, engine.snapshot()]) });
  async function ready() {
    const blockers = productionBlockers();
    if (blockers.length) throw new HttpError(503, blockers.join(" "), "service_not_ready");
    initialization ??= persistence.load().then(snapshot => {
      if (!snapshot) return;
      const channels = snapshot.version === 3 ? snapshot.channels : [["demo", snapshot]];
      if (!Array.isArray(channels) || channels.length > MAX_CHANNELS) throw new Error("Invalid channel snapshot.");
      for (const entry of channels) {
        if (!Array.isArray(entry) || entry.length !== 2 || !(entry[0] === "demo" || /^\d{1,32}$/.test(entry[0])) || engines.has(entry[0])) throw new Error("Invalid channel snapshot.");
        const engine = new DraftEngine({ now });
        engine.restore(entry[1]);
        engines.set(entry[0], engine);
      }
    });
    try { await initialization; }
    catch { throw new HttpError(503, "Storage recovery failed. An operator must repair or restore the saved state before continuing.", "storage_unavailable"); }
  }
  const serialized = operation => {
    if (pendingWrites >= 200) return Promise.reject(new HttpError(503, "The write queue is full. Retry shortly.", "capacity_reached"));
    pendingWrites++;
    const result = writes.then(operation).finally(() => { pendingWrites--; });
    writes = result.catch(() => {});
    return result;
  };
  const broadcast = channelId => {
    for (const [res, channel] of clients) if (channel === channelId && !res.destroyed) {
      try { res.write(`event: refresh\ndata: ${now()}\n\n`); } catch { clients.delete(res); }
    }
  };

  async function handle(req, res) {
    applySecurityHeaders(res);
    try {
      const url = new URL(req.url, "http://localhost");
      rateLimit(`ip:${req.socket?.remoteAddress || "unknown"}`, 6000);
      applyCors(req, res);
      if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
      if (!["GET", "POST"].includes(req.method)) throw new HttpError(405, "Method not allowed.", "method_not_allowed");
      if (url.pathname === "/api/health" && req.method === "GET") { await ready(); return sendJson(res, 200, { ok: true, persistenceMode: persistence.mode, demo: demoEnabled() }); }
      if (url.pathname === "/api/auth/login" || url.pathname === "/api/auth/callback") {
        rateLimit(`auth:${req.socket?.remoteAddress || "unknown"}`, 30);
        if (req.method !== "GET") throw new HttpError(405, "Method not allowed.", "method_not_allowed");
        return url.pathname.endsWith("login") ? beginTwitchAuth(req, res) : await finishTwitchAuth(req, res, url);
      }
      if (url.pathname === "/api/auth/logout") {
        if (req.method !== "POST") throw new HttpError(405, "Use POST to sign out.", "method_not_allowed");
        requireSameOrigin(req); logout(res); return sendJson(res, 200, { ok: true });
      }
      if (url.pathname === "/api/auth/me" && req.method === "GET") return sendJson(res, 200, authFor(req));
      await ready();
      const context = requestContext(req, url);
      rateLimit(`actor:${context.channelId}:${context.viewerId || req.socket?.remoteAddress || "anonymous"}:${req.method}`, req.method === "POST" ? 60 : 120);
      if (req.method === "GET") {
        await writes; // Do not expose a mutation that has not persisted.
        const engine = engines.get(context.channelId) || new DraftEngine({ now });
        if (url.pathname === "/api/state") {
          const publicAuth = context.extension ? { configured: true, authenticated: true, producer: false, role: "extension", user: null } : { ...context.auth, producer: context.producer };
          return sendJson(res, 200, { ...engine.publicState(context.viewerId, { producer: context.producer && url.searchParams.get("producer") === "1" }), auth: publicAuth, channelId: context.channelId,
            extension: context.extension ? { role: context.extension.role, anonymous: context.viewerId.startsWith("A") } : null, persistenceMode: persistence.mode });
        }
        if (url.pathname === "/api/events") {
          if (clients.size >= 500) throw new HttpError(503, "Live connection capacity reached. Use polling.", "capacity_reached");
          res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
          res.write("event: refresh\ndata: connected\n\n");
          clients.set(res, context.channelId);
          req.on("close", () => clients.delete(res));
          return;
        }
        if (["/api/recovery/export", "/api/automation/champions", "/api/automation/matches"].includes(url.pathname)) {
          if (!context.producer) throw new HttpError(403, "Producer access required.", "producer_required");
          if (url.pathname === "/api/automation/champions") return sendJson(res, 200, await championCatalog());
          if (url.pathname === "/api/automation/matches") return sendJson(res, 200, await liveEsportsMatches());
          res.setHeader("content-disposition", 'attachment; filename="pick-predict-recovery.json"');
          return sendJson(res, 200, engine.snapshot());
        }
      }
      if (req.method === "POST") {
        const name = url.pathname.slice(5);
        const producerAction = Object.hasOwn(producerActions, name) ? producerActions[name] : null;
        if (!producerAction && !["join", "predict"].includes(name)) throw new HttpError(404, "Unknown action.", "not_found");
        if (producerAction && !context.producer) throw new HttpError(403, "Sign in as the channel broadcaster or an authorized moderator.", "producer_required");
        if (!context.extension) requireSameOrigin(req);
        if (!producerAction && (!context.viewerId || context.viewerId.startsWith("A"))) throw new HttpError(403, "Sign in to Twitch to participate.", "viewer_sign_in_required");
        const data = await readJsonBody(req, name === "recovery/import" ? 4 * 1024 * 1024 : 65536);
        const result = await serialized(async () => {
          const existed = engines.has(context.channelId);
          if (!existed && name !== "match/create") throw new HttpError(409, "The broadcaster has not configured a series yet.", "channel_not_configured");
          if (!existed && engines.size >= MAX_CHANNELS) throw new HttpError(503, "Channel capacity reached.", "capacity_reached");
          const engine = engines.get(context.channelId) || new DraftEngine({ now });
          if (producerAction && (!Number.isSafeInteger(data.expectedControlRevision) || data.expectedControlRevision !== engine.controlRevision)) throw new HttpError(409, "The producer state changed. Refresh before trying again.", "stale_control_revision");
          if (["predict", "draft/resolve", "draft/cancel"].includes(name) && (!engine.round || data.roundId !== engine.round.id)) throw new HttpError(409, "The round changed. Refresh before trying again.", "stale_round");
          const before = structuredClone(engine.snapshot());
          engines.set(context.channelId, engine);
          let value;
          try {
            if (producerAction) {
              value = producerAction(engine, data);
              engine.controlRevision = before.controlRevision + 1;
            } else if (name === "join") value = { viewer: engine.join(context.viewerId, data.name), viewerId: context.viewerId };
            else value = engine.predict(context.viewerId, data.champion);
          } catch (error) {
            engine.restore(before); if (!existed) engines.delete(context.channelId);
            throw new HttpError(400, error.message, "invalid_action");
          }
          try { await persistence.save(structuredClone(allSnapshots())); }
          catch {
            engine.restore(before); if (!existed) engines.delete(context.channelId);
            throw new HttpError(503, "The change could not be saved. No change was committed. Retry after the service recovers.", "storage_unavailable");
          }
          broadcast(context.channelId);
          return { ok: true, result: value, controlRevision: engine.controlRevision };
        });
        return sendJson(res, 200, result);
      }
      throw new HttpError(404, "Unknown API route.", "not_found");
    } catch (error) {
      if (res.headersSent) { res.end(); return; }
      const status = error instanceof HttpError ? error.status : 500;
      if (error.retryAfter) res.setHeader("retry-after", String(error.retryAfter));
      else if (status === 503) res.setHeader("retry-after", "5");
      if (status === 405) res.setHeader("allow", "GET, POST, OPTIONS");
      return sendJson(res, status, { error: error instanceof HttpError ? error.message : "The request could not be completed. Try again later.", code: error instanceof HttpError ? error.code : "internal_error" });
    }
  }
  return { handle, async close() { await writes; for (const res of clients.keys()) res.end(); clients.clear(); await persistence.close?.(); } };
}

let defaultApi;
export function handleApi(req, res) { defaultApi ??= createApi(); return defaultApi.handle(req, res); }
export async function closeApi() { await defaultApi?.close(); }
