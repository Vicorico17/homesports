import test from "node:test";
import assert from "node:assert/strict";
import { mergeMatchFeed, shouldPollMatchFeed } from "./client-match-feed.ts";
import type { MatchFeed, Match } from "./matches";

const live: MatchFeed = {
  matches: [], game: "lol", demo: false, source: "PandaScore",
  sourceStatus: "healthy", updatedAt: "2026-11-10T10:00:00Z",
};
const unavailable: MatchFeed = {
  ...live, matches: [], demo: true, source: "Demo",
  sourceStatus: "unavailable", updatedAt: "2026-11-10T10:01:00Z",
};

test("unavailable initial feeds retry, but unconfigured providers do not", () => {
  assert.equal(shouldPollMatchFeed("unavailable"), true);
  assert.equal(shouldPollMatchFeed("healthy"), true);
  assert.equal(shouldPollMatchFeed("not-configured"), false);
});

test("failed refresh preserves last good schedule, real-data label, and timestamp", () => {
  const result = mergeMatchFeed(live, unavailable);
  assert.equal(result.matches, live.matches);
  assert.equal(result.demo, false);
  assert.equal(result.source, "PandaScore");
  assert.equal(result.updatedAt, live.updatedAt);
  assert.equal(result.sourceStatus, "unavailable");
});

test("initial demo remains labelled until successful live recovery", () => {
  const stillUnavailable = mergeMatchFeed(unavailable, unavailable);
  assert.equal(stillUnavailable.demo, true);
  assert.equal(stillUnavailable.matches, unavailable.matches);
  assert.equal(mergeMatchFeed(stillUnavailable, live), live);
});


test("partial real data can replace an empty/demo screen without discarding a known full schedule", () => {
  const partial: MatchFeed = { ...live, sourceStatus: "unavailable", matches: [{ id: 42 } as Match] };
  assert.equal(mergeMatchFeed(unavailable, partial), partial);
  assert.equal(mergeMatchFeed(live, partial), partial);
  const previous = { ...live, matches: [{ id: 1 } as Match, { id: 2 } as Match] };
  assert.equal(mergeMatchFeed(previous, partial).matches, previous.matches);
});
