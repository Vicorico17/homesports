import assert from "node:assert/strict";
import test from "node:test";
import type { Match } from "./matches.ts";
import { competitionSchedule, hasWonSeries, mergeCompetitionMatches } from "./competition-schedule.ts";

const match = (id: number, status: Match["status"], beginAt = "2026-11-10T12:00:00Z") => ({ id, status, beginAt, opponents: [{ name: "A", score: 2 }, { name: "B", score: 1 }] }) as Match;

test("separates live, upcoming and completed matches without mutating input", () => {
  const input = [match(3, "finished"), match(2, "upcoming"), match(1, "running")];
  const groups = competitionSchedule(input);
  assert.deepEqual(groups.live.map(item => item.id), [1]);
  assert.deepEqual(groups.upcoming.map(item => item.id), [2]);
  assert.deepEqual(groups.results.map(item => item.id), [3]);
  assert.deepEqual(input.map(item => item.id), [3, 2, 1]);
});

test("deduplicates updated match statuses and puts undated fixtures last", () => {
  const groups = competitionSchedule([match(1, "upcoming"), match(2, "upcoming", ""), match(3, "upcoming", "2026-11-11T12:00:00Z"), match(1, "running")]);
  assert.deepEqual(groups.live.map(item => item.id), [1]);
  assert.deepEqual(groups.upcoming.map(item => item.id), [3, 2]);
});

test("orders results newest first, with invalid dates last", () => {
  const groups = competitionSchedule([match(1, "finished", "invalid"), match(2, "finished"), match(3, "finished", "2026-11-11T12:00:00Z")]);
  assert.deepEqual(groups.results.map(item => item.id), [3, 2, 1]);
});

test("only marks a confirmed completed series winner", () => {
  assert.equal(hasWonSeries(match(1, "running"), 0), false);
  assert.equal(hasWonSeries(match(1, "upcoming"), 0), false);
  assert.equal(hasWonSeries(match(1, "finished"), 0), true);
  assert.equal(hasWonSeries(match(1, "finished"), 1), false);
  assert.equal(hasWonSeries({ status: "finished", opponents: [{ name: "A", score: 2 }, { name: "B" }] }, 0), false);
  assert.equal(hasWonSeries({ status: "finished", opponents: [{ name: "A", score: 2 }, { name: "B", score: 2 }] }, 0), false);
});

test("newer tournament details retain verified feed streams without losing updated scores/status", () => {
  const stream = { url: "https://www.twitch.tv/riotgames", language: "en", official: true };
  const feed = { ...match(1, "upcoming"), streams: [stream] };
  const details = { ...match(1, "running"), streams: [] };
  const merged = mergeCompetitionMatches([feed], [details]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, "running");
  assert.equal(merged[0].opponents[0].score, 2);
  assert.deepEqual(merged[0].streams, [stream]);
  assert.deepEqual(details.streams, []);
  const direct = { ...details, streams: [{ ...stream, url: "https://www.twitch.tv/official" }] };
  assert.deepEqual(mergeCompetitionMatches([feed], [direct])[0].streams, direct.streams);
});
