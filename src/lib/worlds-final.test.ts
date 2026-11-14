import test from "node:test";
import assert from "node:assert/strict";
import { findWorldsFinal, normalizeFinalState } from "./worlds-final.ts";
import type { Match } from "./matches.ts";

const match: Match = { id: 1, status: "finished", beginAt: "2026-11-14T14:00:00Z", name: "A vs B", league: "World Championship", tournament: "Knockout", tournamentId: 1, hasBracket: true, streams: [], rescheduled: false, mapWinners: [], serie: "Worlds 2026", opponents: [], bestOf: 5, importance: 5, importanceReason: "Final" };

test("final spotlight excludes other years, regional finals, semifinals, and play-in finals", () => {
  const others = [
    { ...match, id: 2, serie: "Worlds 2025" },
    { ...match, id: 3, league: "LEC", serie: "LEC 2026", name: "Grand final" },
    { ...match, id: 4, beginAt: "2026-11-07T12:00:00Z", name: "Semi-final" },
    { ...match, id: 5, beginAt: "2026-10-15T12:00:00Z", name: "Grand final", tournament: "Play-in" },
  ];
  assert.equal(findWorldsFinal(others), undefined);
  assert.equal(findWorldsFinal([...others, match])?.id, 1);
});

test("normalization preserves zero stats and missing values without fabricating statistics", () => {
  const state = normalizeFinalState({ id: "123", valid: true, started: true, teams: [{ id: "a", name: "A", score: 0 }, { id: "b", name: "B", score: 1 }], games: [{ id: "g1", sequenceNumber: 1, finished: true, teams: [{ id: "b", kills: 0, netWorth: null, players: [{ id: "p1", name: "Player", kills: 0, deaths: 2, killAssistsGiven: 3, character: { name: "Ahri" } }], objectives: [{ type: "killDragon", completionCount: 0 }] }] }] });
  assert.equal(state?.teams[0].score, 0);
  assert.equal(state?.games[0].teams[0].name, "B");
  assert.equal(state?.games[0].teams[0].kills, 0);
  assert.equal(state?.games[0].teams[0].netWorth, undefined);
  assert.equal(state?.games[0].teams[0].players[0].champion, "Ahri");
  assert.equal(state?.games[0].teams[0].players[0].assists, 3);
  assert.equal(state?.games[0].teams[0].objectives[0].count, 0);
});

test("invalid, partial, and duplicate-team states are rejected", () => {
  for (const state of [null, {}, { id: "1", teams: [] }, { id: "1", valid: false, teams: [{ id: "a" }, { id: "b" }] }, { id: "1", teams: [{ id: "a" }, { id: "a" }] }]) assert.equal(normalizeFinalState(state), null);
});
