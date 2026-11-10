import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { publicPages, publicRouteFamilies, siteCatalog, discoverPagePaths, pageMetadata, websiteStructuredData, serializeJsonLd } from "./site-discovery.ts";
import { agentDiscovery, agentGuide } from "./agent-guide.ts";
import { agentOpenApi } from "./agent-openapi.ts";
import type { MatchFeed } from "./matches.ts";

const origin = "https://homesports.test";
const feed: MatchFeed = { game: "lol", demo: false, source: "PandaScore", sourceStatus: "healthy", updatedAt: "2026-11-10T12:00:00Z", matches: [
  { id: 42, status: "running", beginAt: "", name: "A vs B", league: "League", tournament: "Cup", tournamentId: 7, hasBracket: true, streams: [], rescheduled: false, mapWinners: [], serie: "Season", serieId: 9, opponents: [{ id: 1, name: "A" }, { id: 2, name: "B" }], bestOf: 3, importance: 3, importanceReason: "League" },
] };

test("every public content route is represented in the shared site catalog", () => {
  const files = readdirSync(new URL("../app/", import.meta.url), { recursive: true, encoding: "utf8" });
  const pages = files.filter(file => /(^|\/)page\.tsx$/.test(file)).map(file => `/${file.replace(/(^|\/)page\.tsx$/, "").replace(/\[id\]/g, "{id}")}`);
  const catalog = [...publicPages.map(page => page.path), ...publicRouteFamilies.map(page => page.path.split("?")[0]), "/login"];
  assert.deepEqual([...catalog].sort(), pages.sort(), "Update the catalog when adding/removing a public page");
});

test("discovery and full guide cover all static and dynamic page families", () => {
  const guide = agentGuide(origin), discovery = agentDiscovery(origin), catalog = siteCatalog(origin);
  for (const page of publicPages) {
    assert.ok(guide.includes(origin + page.path));
    assert.ok(discovery.includes(origin + page.path));
  }
  for (const family of publicRouteFamilies) assert.ok(guide.includes(origin + family.path));
  assert.equal(catalog.pages.length, publicPages.length);
  assert.equal(catalog.access.mcpAvailable, false);
  assert.match(catalog.coverage, /not a complete archive/);
  assert.match(catalog.exclusions.join(" "), /redistribution or model-training rights/);
  assert.match(guide, /not a dump of all dynamic pages/);
  assert.ok(discovery.includes(`${origin}/api/agent/site`));
  assert.ok(discovery.includes(`${origin}/llms-full.txt`));
});

test("sitemap includes match and source-backed bracket URLs for each game without duplicates", () => {
  const paths = discoverPagePaths([feed, feed, { ...feed, game: "valorant" }]);
  for (const path of ["/match/42?game=lol", "/match/42?game=valorant", "/competition/7", "/valorant/competition/7", "/bracket/7", "/valorant/bracket/7", "/competition/series/9", "/valorant/teams/1"]) assert.ok(paths.includes(path), path);
  assert.equal(paths.length, new Set(paths).size);
  assert.ok(!paths.includes("/login"));
});

test("demo or absent/invalid ids do not generate fictional discovery URLs", () => {
  assert.deepEqual(discoverPagePaths([{ ...feed, demo: true }]), publicPages.map(page => page.path));
  const invalid = { ...feed.matches[0], id: -1, tournamentId: 0, serieId: NaN, opponents: [{ id: 0, name: "TBD" }, { name: "Unknown" }] };
  assert.deepEqual(discoverPagePaths([{ ...feed, matches: [invalid] }]), publicPages.map(page => page.path));
  const noBracket = discoverPagePaths([{ ...feed, matches: [{ ...feed.matches[0], hasBracket: false }] }]);
  assert.ok(!noBracket.includes("/bracket/7"));
});

test("static page metadata and structured discovery use page-specific canonical URLs", () => {
  for (const page of publicPages) assert.equal(pageMetadata(page.path).alternates?.canonical, page.path);
  const data = websiteStructuredData(origin);
  assert.equal(data["@type"], "WebSite");
  assert.equal(data.url, `${origin}/`);
  assert.equal(data.hasPart.length, publicPages.length);
  assert.equal(JSON.parse(serializeJsonLd({ text: "</script><script>bad</script>" })).text, "</script><script>bad</script>");
  assert.ok(!serializeJsonLd({ text: "</script>" }).includes("<"));
});

test("OpenAPI describes the read-only site catalog and enriched match schema", () => {
  const spec = agentOpenApi(origin);
  assert.equal(spec.paths["/api/agent/site"].get.operationId, "describeSite");
  assert.equal(Object.keys(spec.paths).length, 2);
  assert.deepEqual(spec.security, []);
  const text = JSON.stringify(spec);
  for (const field of ["freshUntil", "bracketUrl", "routeFamilies", "urlTemplate"]) assert.ok(text.includes(`"${field}"`));
});


test("ambiguous legacy or unverified tournament ids are never advertised", () => {
  for (const match of [{ ...feed.matches[0], tournamentId: 42 }, { ...feed.matches[0], tournamentIdVerified: false }]) {
    const paths = discoverPagePaths([{ ...feed, matches: [match] }]);
    assert.ok(!paths.includes(`/competition/${match.tournamentId}`));
    assert.ok(!paths.includes(`/bracket/${match.tournamentId}`));
  }
  const known = discoverPagePaths([{ ...feed, matches: [{ ...feed.matches[0], tournamentId: 42, tournamentIdVerified: true }] }]);
  assert.ok(known.includes("/competition/42"));
});
