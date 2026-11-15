import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./request-guards.js";
import { validExtensionSecret } from "./runtime-config.js";

const parseToken = req => {
  const direct = req.headers["x-extension-jwt"];
  const authorization = req.headers.authorization;
  if (direct !== undefined && (typeof direct !== "string" || !direct || direct.length > 8192)) throw new HttpError(401, "Invalid Extension token.", "invalid_token");
  if (authorization !== undefined && (typeof authorization !== "string" || !/^Bearer [A-Za-z0-9_.-]+$/i.test(authorization) || authorization.length > 8200)) throw new HttpError(401, "Invalid Authorization header.", "invalid_token");
  const bearer = authorization?.slice(7);
  if (direct && bearer && direct !== bearer) throw new HttpError(401, "Conflicting Extension tokens.", "invalid_token");
  return direct || bearer || null;
};

export function verifyExtensionJwt(req) {
  const token = parseToken(req);
  if (!token) return null;
  const secret = process.env.TWITCH_EXTENSION_SECRET;
  if (!validExtensionSecret(secret)) throw new HttpError(503, "Twitch Extension authentication is not configured.", "authentication_unavailable");
  try {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed Extension token.");
  const [encodedHeader, encodedPayload, signature] = parts;
  const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
  if (header.alg !== "HS256") throw new Error("Unsupported Extension token algorithm.");
  const expected = createHmac("sha256", Buffer.from(secret, "base64")).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid Extension token signature.");
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new Error("Extension token expired.");
  if (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || payload.nbf * 1000 > Date.now())) throw new Error("Extension token is not active.");
  if (typeof payload.channel_id !== "string" || !/^\d{1,32}$/.test(payload.channel_id) || typeof payload.opaque_user_id !== "string" || !/^[UA][A-Za-z0-9_-]{1,127}$/.test(payload.opaque_user_id)) throw new Error("Extension token is missing identity claims.");
  if (!["viewer", "moderator", "broadcaster"].includes(payload.role)) throw new Error("Invalid Extension viewer role.");
  return payload;
  } catch (error) { throw new HttpError(401, error instanceof SyntaxError ? "Malformed Extension token." : error.message, "invalid_token"); }
}
