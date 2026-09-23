import test from "node:test";
import assert from "node:assert/strict";
import { isWorlds2026Match, swissRecords, worldsStage } from "./worlds.ts";
import type { Match } from "./matches.ts";

const base: Match = { id: 1, status: "finished", beginAt: "2026-10-25T12:00:00Z", name: "A vs B", league: "World Championship", tournament: "Swiss Stage", tournamentId: 11, hasBracket: false, streams: [], rescheduled: false, mapWinners: [], serie: "Worlds 2026", opponents: [{ id: 1, name: "A", score: 2 }, { id: 2, name: "B", score: 1 }], bestOf: 3, importance: 4, importanceReason: "International event" };

test("identifies only the requested Worlds season and distinguishes Swiss from knockout", () => {
  assert.equal(isWorlds2026Match(base), true);
  assert.equal(isWorlds2026Match({ ...base, serie: "Worlds 2025" }), false);
  assert.equal(isWorlds2026Match({ ...base, league: "LEC", serie: "LEC 2026" }), false);
  assert.equal(worldsStage(base), "Swiss");
  assert.equal(worldsStage({ ...base, tournament: "Knockout Stage" }), "Knockout");
});

test("Swiss records use only completed, decisive source scores and dedupe IDs", () => {
  const rows = swissRecords([base, base, { ...base, id: 2, status: "upcoming" }, { ...base, id: 3, opponents: [{ ...base.opponents[0], score: undefined }, base.opponents[1]] }]);
  assert.deepEqual(rows.map(row => [row.name, row.wins, row.losses]), [["A", 1, 0], ["B", 0, 1]]);
});
