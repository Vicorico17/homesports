import type { Match, MatchFeed, MatchStatus } from "./matches.ts";
import type { Game } from "./game.ts";

export const AGENT_SCHEMA_VERSION = "1.0";
export const AGENT_REFRESH_SECONDS = 60;
export const AGENT_MAX_LIMIT = 50;

export type AgentQuery = {
  game: Game;
  status: MatchStatus | "all";
  q: string;
  minImportance: number;
  limit: number;
  offset: number;
  includeResults: boolean;
};

export class AgentQueryError extends Error {}

export function siteOrigin(value = process.env.NEXT_PUBLIC_SITE_URL): string {
  try {
    const url = new URL(value ?? "https://homesports.vercel.app");
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return url.origin;
  } catch { /* Use the same public default as the rest of the site. */ }
  return "https://homesports.vercel.app";
}

export function parseAgentQuery(params: URLSearchParams): AgentQuery {
  const allowed = new Set(["game", "status", "q", "min_importance", "limit", "offset", "include_results"]);
  for (const key of params.keys()) {
    if (!allowed.has(key)) throw new AgentQueryError(`Unknown parameter: ${key.slice(0, 40)}.`);
    if (params.getAll(key).length !== 1) throw new AgentQueryError(`Parameter ${key} must appear once.`);
  }
  const game = params.get("game") ?? "lol";
  const status = params.get("status") ?? "all";
  const results = params.get("include_results") ?? "false";
  const q = (params.get("q") ?? "").trim();
  if (game !== "lol" && game !== "valorant") throw new AgentQueryError("game must be lol or valorant.");
  if (!["all", "running", "upcoming", "finished"].includes(status)) throw new AgentQueryError("status must be all, running, upcoming, or finished.");
  if (results !== "true" && results !== "false") throw new AgentQueryError("include_results must be true or false.");
  if (q.length > 120) throw new AgentQueryError("q must contain at most 120 characters.");
  const integer = (key: string, fallback: number, minimum: number, maximum: number) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new AgentQueryError(`${key} must be an integer from ${minimum} to ${maximum}.`);
    }
    return value;
  };
  return {
    game, status: status as AgentQuery["status"], q,
    minImportance: integer("min_importance", 1, 1, 5),
    limit: integer("limit", 20, 1, AGENT_MAX_LIMIT),
    offset: integer("offset", 0, 0, 10000),
    includeResults: results === "true",
  };
}

function publicHttpsUrl(value?: string): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function projectMatch(match: Match, query: AgentQuery, origin: string) {
  return {
    id: match.id,
    url: `${origin}/match/${match.id}?game=${query.game}`,
    status: match.status,
    startsAt: match.beginAt && Number.isFinite(Date.parse(match.beginAt)) ? new Date(match.beginAt).toISOString() : null,
    rescheduled: match.rescheduled,
    league: match.league,
    tournament: { id: match.tournamentId, name: match.tournament },
    series: { id: match.serieId ?? null, name: match.serie },
    opponents: match.opponents.map(team => ({
      id: team.id ?? null, name: team.name,
      ...(query.includeResults && typeof team.score === "number" && Number.isFinite(team.score) ? { score: team.score } : {}),
    })),
    bestOf: match.bestOf,
    importance: { stars: match.importance, reason: match.importanceReason },
    streams: match.streams.flatMap(stream => {
      const url = publicHttpsUrl(stream.url);
      if (!url) return [];
      // Stream enrichment is optional and shared with the regular matchboard.
      const provenance = stream as typeof stream & { source?: string; sourceUrl?: string; main?: boolean };
      const sourceUrl = publicHttpsUrl(provenance.sourceUrl);
      return [{ url, language: stream.language, official: stream.official,
        ...(provenance.source ? { source: provenance.source } : {}),
        ...(sourceUrl ? { sourceUrl } : {}),
        ...(typeof provenance.main === "boolean" ? { main: provenance.main } : {}),
      }];
    }),
  };
}

export function createAgentFeed(feed: MatchFeed, query: AgentQuery, origin = siteOrigin()) {
  const needle = query.q.toLocaleLowerCase("en");
  const filtered = feed.matches.filter(match =>
    (query.status === "all" || match.status === query.status) &&
    match.importance >= query.minImportance &&
    (!needle || [match.league, match.tournament, match.serie, ...match.opponents.map(team => team.name)]
      .join(" ").toLocaleLowerCase("en").includes(needle)),
  );
  const nextOffset = query.offset + query.limit;
  const nextParams = new URLSearchParams({
    game: query.game, status: query.status, q: query.q,
    min_importance: String(query.minImportance), limit: String(query.limit),
    offset: String(nextOffset), include_results: String(query.includeResults),
  });
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    game: feed.game,
    source: { name: feed.source, status: feed.sourceStatus, demo: feed.demo, updatedAt: feed.updatedAt },
    coverage: "Current matchboard snapshot only; not a complete schedule or historical archive.",
    refreshAfterSeconds: AGENT_REFRESH_SECONDS,
    resultsIncluded: query.includeResults,
    warnings: [
      ...(feed.demo ? ["Demo data: do not report these matches as real fixtures or results."] : []),
      ...(feed.sourceStatus === "unavailable" ? ["The provider is unavailable, partial, or stale. Verify before claiming current status or an empty schedule."] : []),
      "Schedules may change. Running status and series scores are provider snapshots, not real-time game telemetry.",
    ],
    pagination: { offset: query.offset, limit: query.limit, total: filtered.length,
      next: nextOffset < filtered.length ? `${origin}/api/agent/matches?${nextParams}` : null },
    matches: filtered.slice(query.offset, nextOffset).map(match => projectMatch(match, query, origin)),
  };
}

export async function agentMatchesResponse(request: Request, load: (game: Game) => Promise<MatchFeed>) {
  let query: AgentQuery;
  try { query = parseAgentQuery(new URL(request.url).searchParams); }
  catch (error) {
    return Response.json({ error: "invalid_query", message: error instanceof AgentQueryError ? error.message : "Invalid query." },
      { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const feed = await load(query.game);
    return Response.json(createAgentFeed(feed, query), { headers: {
      "Cache-Control": feed.sourceStatus === "healthy" ? "public, s-maxage=60, stale-while-revalidate=60" : "no-store",
      "X-Content-Type-Options": "nosniff",
      "Link": '</llms.txt>; rel="describedby", </api/agent/openapi>; rel="service-desc"; type="application/json"',
    } });
  } catch {
    return Response.json({ error: "feed_unavailable", message: "The match feed could not be loaded. Retry later; do not interpret this as no matches." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": String(AGENT_REFRESH_SECONDS) } });
  }
}
