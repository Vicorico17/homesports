import test from "node:test";
import assert from "node:assert/strict";
import { loadMatchPages, normalizeMatchGroups, markStaleFeed, MatchFeedUnavailable, singleFlight } from "./match-feed-loader.ts";
import type { MatchFeed, PandaMatch } from "./matches.ts";

const match = { id: 1, name: "A vs B", status: "not_started", number_of_games: 3 } satisfies PandaMatch;
const response = (data: PandaMatch[] | null) => ({ data, status: data ? 200 : 429, sourceDate: "2026-11-10T12:00:00Z" });

test("short schedules require three provider pages, not five", async () => {
  const paths: string[] = [];
  const result = await loadMatchPages("lol", async path => { paths.push(path); return response([match]); });
  assert.equal(paths.length, 3);
  assert.equal(result.complete, true);
  assert.equal(result.groups.flatMap(group => group.matches).length, 3);
});

test("fetches second pages only for the full categories and keeps games separate", async () => {
  const paths: string[] = [];
  const result = await loadMatchPages("valorant", async path => {
    paths.push(path);
    return response(path.includes("/past?") && path.endsWith("page=1") ? Array(100).fill(match) : []);
  });
  assert.equal(paths.length, 4);
  assert.ok(paths.every(path => path.startsWith("valorant/")));
  assert.ok(paths.some(path => path.includes("/past?") && path.endsWith("page=2")));
  assert.equal(result.complete, true);
});

test("a rate-limited page preserves other successful pages for a cold-start fallback", async () => {
  const result = await loadMatchPages("lol", async path => response(path.includes("/past?") ? null : [match]));
  assert.equal(result.complete, false);
  assert.equal(result.groups.flatMap(group => group.matches).length, 2);
});

test("cached snapshots older than three minutes are explicitly marked degraded", () => {
  const feed: MatchFeed = { game: "lol", matches: [], demo: false, source: "PandaScore", sourceStatus: "healthy", updatedAt: "2026-11-10T12:00:00Z" };
  assert.equal(markStaleFeed(feed, Date.parse(feed.updatedAt) + 179_000), feed);
  const stale = markStaleFeed(feed, Date.parse(feed.updatedAt) + 181_000);
  assert.equal(stale.sourceStatus, "unavailable");
  assert.equal(stale.matches, feed.matches);
  assert.equal(stale.updatedAt, feed.updatedAt);
  assert.equal(new MatchFeedUnavailable(stale).fallback(), stale);
  assert.ok(!JSON.stringify(new MatchFeedUnavailable(stale)).includes('"matches"'));
});

test("concurrent refreshes collapse per game and a failure does not lock out recovery", async () => {
  let calls = 0;
  let finish: (() => void) | undefined;
  const load = singleFlight(async (game: string) => { calls++; await new Promise<void>(resolve => { finish = resolve; }); return game; });
  const a = load("lol"), b = load("lol");
  assert.equal(a, b); assert.equal(calls, 1);
  finish?.(); assert.equal(await a, "lol");
  const c = load("lol"); assert.equal(calls, 2); finish?.(); await c;
  let fail = true;
  const retry = singleFlight(async () => { if (fail) throw Error("offline"); return 42; });
  await assert.rejects(retry("lol")); fail = false;
  assert.equal(await retry("lol"), 42);
});


test("malformed records and normalization errors retain valid results as a degraded snapshot", () => {
  const result = normalizeMatchGroups([
    { matches: [null, match, { ...match, id: 2 }] as PandaMatch[], status: "upcoming", sourceDate: null },
  ], value => { if (value.id === 2) throw Error("Malformed nested data"); return value.id; });
  assert.equal(result.complete, false);
  assert.deepEqual(result.groups[0].matches, [1]);
});
