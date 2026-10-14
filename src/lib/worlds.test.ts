import test from "node:test";
import assert from "node:assert/strict";
import { filterWorldsMatches, groupWorldsMatches, isWorlds2026Match, swissRecords, worldsStage } from "./worlds.ts";
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


test("recognizes provider Group Stage as Swiss only for Worlds 2026", () => {
  assert.equal(worldsStage({ ...base, tournament: "Group Stage" }), "Swiss");
  assert.equal(worldsStage({ ...base, tournament: "Group Stage", serie: "Worlds 2025" }), "Other");
  assert.equal(worldsStage({ ...base, tournament: "Group Stage", league: "LEC", serie: "LEC 2026" }), "Other");
  assert.equal(worldsStage({ ...base, tournament: "Play-In" }), "Play-in");
  assert.equal(worldsStage({ ...base, tournament: "Playoffs" }), "Knockout");
  assert.deepEqual(swissRecords([{ ...base, tournament: "Group Stage" }]).map(row => [row.name, row.wins]), [["A", 1], ["B", 0]]);
});

test("Worlds match groups preserve published rounds and dates without inventing draws", () => {
  const round = { ...base, id: 2, name: "Swiss Round 2: A vs B", beginAt: "2026-10-26T12:00:00Z" };
  const unknown = { ...base, id: 3, name: "TBD", beginAt: "", opponents: [] };
  const groups = groupWorldsMatches([unknown, round, base, base]);
  assert.deepEqual(groups.map(group => group.label), ["2026-10-25", "Swiss Round 2", "Schedule pending"]);
  assert.equal(groups.flatMap(group => group.matches).length, 3);
  assert.deepEqual(groups[2].matches[0].opponents, []);
  assert.equal(groupWorldsMatches([{ ...base, beginAt: "invalid" }])[0].label, "Schedule pending");
});

test("Worlds section respects league, search, and importance filters", () => {
  const older = { ...base, id: 2, serie: "Worlds 2025" };
  const regional = { ...base, id: 3, league: "LEC", serie: "LEC 2026" };
  const all = [base, older, regional];
  const filters = { league: "all", minimum: 1, query: "" };
  assert.deepEqual(filterWorldsMatches(all, filters), [base]);
  assert.deepEqual(filterWorldsMatches(all, { ...filters, query: " a " }), [base]);
  assert.deepEqual(filterWorldsMatches(all, { ...filters, query: "missing team" }), []);
  assert.deepEqual(filterWorldsMatches(all, { ...filters, league: "LEC" }), []);
  assert.deepEqual(filterWorldsMatches(all, { ...filters, minimum: 5 }), []);
});
