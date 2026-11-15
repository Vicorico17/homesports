import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closeApi, handleApi } from "./api.js";
import { applySecurityHeaders } from "./request-guards.js";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const port = Number(process.env.PORT) || 4173;

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  applySecurityHeaders(res);
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) return handleApi(req, res);
    if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405, { allow: "GET, HEAD" }); return res.end("Method not allowed."); }

    const path = url.pathname === "/" ? "/index.html" : url.pathname === "/control" ? "/control.html" : url.pathname === "/overlay" ? "/overlay.html" : url.pathname === "/automation" ? "/automation.html" : url.pathname;
    if (path.includes("..")) { res.writeHead(400); return res.end("Invalid path."); }
    const file = await readFile(join(root, path));
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream", "content-security-policy": "default-src 'self'; script-src 'self' https://extension-files.twitch.tv; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://ddragon.leagueoflegends.com; connect-src 'self' https://ddragon.leagueoflegends.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://*.twitch.tv https://*.ext-twitch.tv" });
    res.end(req.method === "HEAD" ? undefined : file);
  } catch (error) {
    if (error.code === "ENOENT") { res.writeHead(404); return res.end("Not found."); }
    res.writeHead(400); res.end("Request failed.");
  }
});

server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(port, process.env.HOST || "127.0.0.1", () => console.log(`Pick Predict running on port ${port}`));
const shutdown = async () => { await closeApi(); server.close(() => process.exit(0)); server.closeIdleConnections(); };
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
