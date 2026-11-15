import test from "node:test";
import assert from "node:assert/strict";
import { verifiedHistoricalSeries } from "./grid-history.ts";
import { normalizeFinalState } from "./worlds-final.ts";
test("historical GRID records require exact series, opponents and completed state", () => {
  const state = normalizeFinalState({ id: "3012986", valid: true, finished: true, teams: [{ id: "a", name: "Gen.G Esports" }, { id: "b", name: "BILIBILI GAMING" }] })!;
  assert.ok(verifiedHistoricalSeries("3012986", { state, status: "ready", fetchedAt: null }));
  assert.equal(verifiedHistoricalSeries("3", { state, status: "ready", fetchedAt: null }), null);
  assert.equal(verifiedHistoricalSeries("3012986", { state: { ...state, finished: false }, status: "ready", fetchedAt: null }), null);
  assert.equal(verifiedHistoricalSeries("3012986", { state: { ...state, teams: [] }, status: "ready", fetchedAt: null }), null);
});
