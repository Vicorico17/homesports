import test from "node:test";
import assert from "node:assert/strict";
import { agentMatchesResponse, createAgentFeed, parseAgentQuery, siteOrigin } from "./agent-access.ts";
import { agentDiscovery, agentGuide } from "./agent-guide.ts";
import { agentOpenApi } from "./agent-openapi.ts";
import type { Match, MatchFeed } from "./matches.ts";

const match: Match = {
  id: 42, status: "running", beginAt: "2026-11-10T14:00:00+02:00", name: "A vs B",
  league: "World Championship", tournament: "Final", tournamentId: 7, hasBracket: true,
  streams: [{ url: "https://www.twitch.tv/riotgames", language: "en", official: true }],
  rescheduled: false, mapWinners: ["Team A"], serie: "Worlds 2026", serieId: 9,
  opponents: [{ id: 1, name: "Team A", score: 2 }, { id: 2, name: "Team B", score: 1 }],
  bestOf: 5, importance: 5, importanceReason: "International final",
  odds: [{ bookmaker: "Private odds", home: 1.5, away: 2.0 }],
};
const feed: MatchFeed = {
  game: "lol", matches: [match, { ...match, id: 43, importance: 3, status: "upcoming" }],
  demo: false, source: "PandaScore", sourceStatus: "healthy", updatedAt: "2026-11-10T12:00:00Z",
};
const query = (value = "") => parseAgentQuery(new URLSearchParams(value));

test("agent query defaults are bounded and spoiler-safe", () => {
  assert.deepEqual(query(), { game: "lol", status: "all", q: "", minImportance: 1, limit: 20, offset: 0, includeResults: false });
  assert.equal(query("game=valorant&limit=50&offset=10000&include_results=true").includeResults, true);
});

test("agent query rejects typos, duplicates, invalid ranges and non-integers", () => {
  for (const bad of ["game=cs2", "game=", "status=live", "include_results=1", "limit=0", "limit=51", "limit=1.5", "limit=1e1", "limit=", "offset=-1", "offset=10001", "min_importance=6", "unknown=1", "game=lol&game=valorant", `q=${"a".repeat(121)}`]) {
    assert.throws(() => query(bad), bad);
  }
});

test("agent projection hides scores, map winners, odds and unrelated fields", () => {
  const result = createAgentFeed(feed, query(), "https://homesports.test");
  assert.deepEqual(result.matches[0].opponents, [{ id: 1, name: "Team A", url: "https://homesports.test/teams/1" }, { id: 2, name: "Team B", url: "https://homesports.test/teams/2" }]);
  assert.equal(result.matches[0].startsAt, "2026-11-10T12:00:00.000Z");
  assert.equal(result.matches[0].url, "https://homesports.test/match/42?game=lol");
  assert.equal(result.resultsIncluded, false);
  assert.equal("mapWinners" in result.matches[0], false);
  assert.equal("odds" in result.matches[0], false);
  assert.equal("name" in result.matches[0], false);
  assert.equal(feed.matches[0].opponents[0].score, 2, "Projection must not mutate the shared feed");
});

test("explicit result opt-in includes finite provider scores only", () => {
  const result = createAgentFeed({ ...feed, matches: [{ ...match, opponents: [{ name: "A", score: 0 }, { name: "B", score: NaN }] }] }, query("include_results=true"));
  assert.equal(result.matches[0].opponents[0].score, 0);
  assert.equal("score" in result.matches[0].opponents[1], false);
});

test("agent filtering and pagination preserve every filter and spoiler choice", () => {
  const result = createAgentFeed(feed, query("q=TEAM&limit=1&min_importance=3&include_results=true"), "https://homesports.test");
  assert.equal(result.pagination.total, 2);
  assert.equal(result.matches.length, 1);
  assert.ok(result.pagination.next);
  const next = new URL(result.pagination.next);
  assert.equal(next.searchParams.get("include_results"), "true");
  assert.equal(next.searchParams.get("q"), "TEAM");
  assert.equal(next.searchParams.get("min_importance"), "3");
  const page = createAgentFeed(feed, parseAgentQuery(next.searchParams));
  assert.equal(page.matches[0].id, 43);
  assert.equal(page.pagination.next, null);
  assert.equal(createAgentFeed(feed, query("status=running&min_importance=4&q=worlds")).pagination.total, 1);
  assert.equal(createAgentFeed(feed, query("offset=100")).matches.length, 0);
});

test("demo and degraded source quality are explicit even for empty feeds", () => {
  const demo = createAgentFeed({ ...feed, demo: true, source: "Demo", sourceStatus: "not-configured" }, query());
  assert.equal(demo.source.demo, true);
  assert.match(demo.warnings[0], /Demo data/);
  const stale = createAgentFeed({ ...feed, matches: [], sourceStatus: "unavailable" }, query());
  assert.equal(stale.source.status, "unavailable");
  assert.equal(stale.source.updatedAt, feed.updatedAt);
  assert.match(stale.warnings.join(" "), /partial, or stale/);
});

test("unknown times and missing team identifiers remain null", () => {
  const result = createAgentFeed({ ...feed, matches: [{ ...match, beginAt: "invalid", opponents: [{ name: "TBD" }] }] }, query());
  assert.equal(result.matches[0].startsAt, null);
  assert.deepEqual(result.matches[0].opponents, [{ id: null, name: "TBD", url: null }]);
});

test("stream projection rejects unsafe URLs and preserves optional source provenance", () => {
  const safe = { url: "https://www.twitch.tv/riotgames", language: "en", official: true, source: "LoL Esports", sourceUrl: "https://lolesports.com/", main: true };
  const result = createAgentFeed({ ...feed, matches: [{ ...match, streams: [safe, ...["javascript:alert(1)", "//evil.example", "https://user:secret@example.com", "not a url", "http://example.com"].map(url => ({ url, language: "en", official: false }))] }] }, query());
  assert.deepEqual(result.matches[0].streams, [safe]);
});

test("canonical origin is configured, never copied from request host", async () => {
  assert.equal(siteOrigin("https://homesports.test/path"), "https://homesports.test");
  assert.equal(siteOrigin("javascript:alert(1)"), "https://homesports.vercel.app");
  assert.equal(siteOrigin("https://user:secret@example.com"), "https://homesports.vercel.app");
  const response = await agentMatchesResponse(new Request("https://attacker.test/api/agent/matches"), async () => feed);
  const data = await response.json();
  assert.equal(data.matches[0].url.startsWith("https://attacker.test"), false);
});

test("invalid requests do not call the provider and return a noncached 400", async () => {
  let calls = 0;
  const response = await agentMatchesResponse(new Request("https://homesports.test/api/agent/matches?game=bad"), async () => { calls++; return feed; });
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).error, "invalid_query");
});

test("agent route selects the game and reuses a cacheable healthy feed", async () => {
  let game;
  const response = await agentMatchesResponse(new Request("https://homesports.test/api/agent/matches?game=valorant"), async selected => { game = selected; return { ...feed, game: selected }; });
  assert.equal(game, "valorant");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /s-maxage=60/);
  assert.match((await response.json()).matches[0].url, /game=valorant$/);
});

test("degraded feeds retain quality metadata but are not cached at CDN", async () => {
  const response = await agentMatchesResponse(new Request("https://homesports.test/api/agent/matches"), async () => ({ ...feed, sourceStatus: "unavailable" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).source.status, "unavailable");
});

test("unexpected provider failures return 503 without leaking error details", async () => {
  const response = await agentMatchesResponse(new Request("https://homesports.test/api/agent/matches"), async () => { throw new Error("secret token must not appear"); });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await response.text(), /secret token/);
});

test("guide, discovery, and OpenAPI consistently describe the implemented HTTP API", () => {
  const origin = "https://homesports.test";
  const guide = agentGuide(origin);
  assert.match(guide, /not yet available at \/mcp/);
  assert.match(guide, /include_results=true/);
  assert.ok(agentDiscovery(origin).includes(`${origin}/agents/index.md`));
  const spec = agentOpenApi(origin);
  assert.equal(spec.openapi, "3.1.0");
  assert.equal(spec.servers[0].url, origin);
  assert.equal(spec.paths["/api/agent/matches"].get.operationId, "listMatches");
  assert.equal(spec.paths["/api/agent/matches"].get.parameters.length, 7);
  assert.deepEqual(spec.security, []);
});


test("agent details link to the correct game without inventing unavailable ids", () => {
  const result = createAgentFeed({ ...feed, game: "valorant" }, query("game=valorant"), "https://homesports.test");
  assert.equal(result.matches[0].tournament.url, "https://homesports.test/valorant/competition/7");
  assert.equal(result.matches[0].tournament.bracketUrl, "https://homesports.test/valorant/bracket/7");
  assert.equal(result.matches[0].series.url, "https://homesports.test/valorant/competition/series/9");
  assert.equal(result.matches[0].opponents[0].url, "https://homesports.test/valorant/teams/1");
  const missing = createAgentFeed({ ...feed, matches: [{ ...match, tournamentId: 0, serieId: undefined, hasBracket: false }] }, query());
  assert.equal(missing.matches[0].tournament.url, null);
  assert.equal(missing.matches[0].tournament.bracketUrl, null);
  assert.equal(missing.matches[0].series.url, null);
});

test("non-live matches do not advertise streams as current broadcasts or replays", () => {
  for (const status of ["upcoming", "finished"] as const) {
    const result = createAgentFeed({ ...feed, matches: [{ ...match, status }] }, query());
    assert.deepEqual(result.matches[0].streams, []);
  }
});

test("freshness deadline is preserved or explicitly unknown and stale data warns", () => {
  const result = createAgentFeed({ ...feed, freshUntil: "2000-01-01T00:00:00Z" }, query());
  assert.equal(result.source.freshUntil, "2000-01-01T00:00:00Z");
  assert.match(result.warnings.join(" "), /freshness deadline has passed/);
  assert.equal(createAgentFeed(feed, query()).source.freshUntil, null);
});


test("agent API suppresses fallback tournament ids in new and legacy feed snapshots", () => {
  for (const candidate of [{ ...match, tournamentId: match.id }, { ...match, tournamentIdVerified: false }]) {
    const result = createAgentFeed({ ...feed, matches: [candidate] }, query());
    assert.equal(result.matches[0].tournament.id, null);
    assert.equal(result.matches[0].tournament.url, null);
    assert.equal(result.matches[0].tournament.bracketUrl, null);
  }
});
