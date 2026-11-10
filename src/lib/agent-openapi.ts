import { AGENT_SCHEMA_VERSION, siteOrigin } from "./agent-access.ts";

export function agentOpenApi(origin = siteOrigin()) {
  const string = { type: "string" };
  const integer = { type: "integer" };
  const boolean = { type: "boolean" };
  const uri = { type: "string", format: "uri" };
  const nullableId = { type: ["integer", "null"] };
  const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });
  const parameter = (name: string, schema: Record<string, unknown>, description: string) => ({ name, in: "query", required: false, schema, description });
  const error = object({ error: string, message: string });
  const response = object({
    schemaVersion: { type: "string", const: AGENT_SCHEMA_VERSION },
    game: { type: "string", enum: ["lol", "valorant"] },
    source: object({ name: { type: "string", enum: ["PandaScore", "Demo"] }, status: { type: "string", enum: ["healthy", "not-configured", "unavailable"] }, demo: boolean, updatedAt: { type: "string", format: "date-time" } }),
    coverage: string,
    refreshAfterSeconds: { type: "integer", const: 60 },
    resultsIncluded: boolean,
    warnings: { type: "array", items: string },
    pagination: object({ offset: integer, limit: integer, total: integer, next: { type: ["string", "null"], format: "uri" } }),
    matches: { type: "array", maxItems: 50, items: object({
      id: integer, url: uri, status: { type: "string", enum: ["running", "upcoming", "finished"] },
      startsAt: { type: ["string", "null"], format: "date-time" }, rescheduled: boolean,
      league: string, tournament: object({ id: integer, name: string }), series: object({ id: nullableId, name: string }),
      opponents: { type: "array", items: object({ id: nullableId, name: string, score: { type: "number", description: "Present only when include_results=true and a finite provider score exists." } }, ["id", "name"]) },
      bestOf: integer, importance: object({ stars: { type: "integer", minimum: 1, maximum: 5 }, reason: string }),
      streams: { type: "array", items: object({ url: uri, language: string, official: boolean, source: string, sourceUrl: uri, main: boolean }, ["url", "language", "official"]) },
    }) },
  });
  return {
    openapi: "3.1.0",
    info: { title: "HomeSports public agent API", version: AGENT_SCHEMA_VERSION, description: "Read-only current matchboard snapshots. Inspect source quality and timestamps. Demo records are not real matches; results are opt-in. No full archive or guaranteed real-time telemetry. This is an HTTP API, not an MCP server." },
    servers: [{ url: origin }],
    security: [],
    paths: { "/api/agent/matches": { get: {
      operationId: "listMatches",
      summary: "Read public League of Legends or Valorant matches",
      description: "Poll at most once per minute per game. Follow pagination.next for the current snapshot. Provider data can be partial or stale even on HTTP 200. Cite match.url. Score inclusion must match the user's spoiler preference.",
      parameters: [
        parameter("game", { type: "string", enum: ["lol", "valorant"], default: "lol" }, "Game to query."),
        parameter("status", { type: "string", enum: ["all", "running", "upcoming", "finished"], default: "all" }, "Provider match status."),
        parameter("q", { type: "string", maxLength: 120, default: "" }, "Case-insensitive substring of team, league, tournament, or series names."),
        parameter("min_importance", { type: "integer", minimum: 1, maximum: 5, default: 1 }, "Minimum editorial importance. Not a probability."),
        parameter("limit", { type: "integer", minimum: 1, maximum: 50, default: 20 }, "Maximum results per page."),
        parameter("offset", { type: "integer", minimum: 0, maximum: 10000, default: 0 }, "Results to skip within this filtered snapshot."),
        parameter("include_results", { type: "boolean", default: false }, "Include available series scores only when explicitly requested."),
      ],
      responses: {
        "200": { description: "Current snapshot. Inspect source.demo and source.status before using data.", content: { "application/json": { schema: response } } },
        "400": { description: "Invalid, repeated, or unknown query parameter.", content: { "application/json": { schema: error } } },
        "503": { description: "Feed unavailable. Respect Retry-After; do not interpret as an empty schedule.", headers: { "Retry-After": { schema: integer, description: "Seconds before retrying." } }, content: { "application/json": { schema: error } } },
      },
    } } },
  };
}
