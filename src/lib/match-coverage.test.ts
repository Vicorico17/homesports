import test from "node:test";
import assert from "node:assert/strict";
import { matchCoverage } from "./match-coverage.ts";
import type { FinalFeed } from "./worlds-final.ts";
const link = { pandaScoreMatchId: 1, gridSeriesId: "22" };
const feed: FinalFeed = { status: "ready", coverage: "full", fetchedAt: "2026-11-15T00:00:00Z", state: { id: "22", started: true, finished: false, teams: [], games: [] } };
test("verified GRID coverage groups separately without defining price or access", () => {
  assert.deepEqual(matchCoverage(1, link, feed), { section: "premium", provider: "GRID", gridSeriesId: "22", detail: "full" });
  assert.equal(matchCoverage(1, link, { ...feed, coverage: "basic" }).section, "premium");
});
test("unknown, unavailable and mismatched coverage stays standard", () => {
  for (const result of [matchCoverage(1, null, feed), matchCoverage(2, link, feed), matchCoverage(1, link, null), matchCoverage(1, link, { ...feed, state: null }), matchCoverage(1, link, { ...feed, status: "pending" }), matchCoverage(1, link, { ...feed, coverage: undefined }), matchCoverage(1, { ...link, gridSeriesId: "23" }, feed)]) assert.equal(result.section, "standard");
});
