import { allowedOrigins, publicOrigin } from "./runtime-config.js";

export class HttpError extends Error {
  constructor(status, message, code = "request_failed") { super(message); this.status = status; this.code = code; }
}

export function applySecurityHeaders(res) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
}

export function applyCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader("vary", "Origin");
  if (origin && (typeof origin !== "string" || !allowedOrigins().has(origin))) throw new HttpError(403, "This origin is not allowed.", "origin_not_allowed");
  if (origin) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    res.setHeader("access-control-allow-headers", "Content-Type,Authorization,X-Extension-JWT,X-Viewer-ID");
    res.setHeader("access-control-max-age", "600");
  }
}

export function requireSameOrigin(req) {
  if (!publicOrigin() || req.headers.origin !== publicOrigin() || req.headers["sec-fetch-site"] === "cross-site") {
    throw new HttpError(403, "Open the producer desk on its configured site before submitting changes.", "csrf_rejected");
  }
}

export async function readJsonBody(req, maximum = 65536) {
  if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers["content-type"] || ""))) throw new HttpError(415, "Use application/json.", "unsupported_content_type");
  const length = req.headers["content-length"];
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new HttpError(413, "Request body is too large.", "body_too_large");
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > maximum) throw new HttpError(413, "Request body is too large.", "body_too_large");
    chunks.push(chunk);
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new HttpError(400, "Malformed JSON body.", "invalid_json"); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Body must be a JSON object.", "invalid_json");
  return data;
}

/** Bounded, per-process limiter. Multi-instance deployments need a shared equivalent. */
export function createRateLimiter({ now = Date.now, maximumKeys = 10000 } = {}) {
  const buckets = new Map();
  return (key, limit, windowMs = 60000) => {
    const current = now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.expires <= current) {
      if (buckets.size >= maximumKeys) {
        for (const [id, value] of buckets) if (value.expires <= current) buckets.delete(id);
        if (buckets.size >= maximumKeys && !buckets.has(key)) throw new HttpError(503, "Service is busy. Retry shortly.", "capacity_reached");
      }
      bucket = { count: 0, expires: current + windowMs };
      buckets.set(key, bucket);
    }
    if (++bucket.count > limit) {
      const error = new HttpError(429, "Too many requests. Wait before trying again.", "rate_limited");
      error.retryAfter = Math.max(1, Math.ceil((bucket.expires - current) / 1000));
      throw error;
    }
  };
}
