import assert from "node:assert/strict";
import { test } from "node:test";
import { eventGame, marketAverage, matchOddsEvent, type OddsEvent } from "./odds.ts";
import type { Match } from "./matches.ts";

const match = { beginAt: "2026-09-28T12:00:00Z", opponents: [{ name: "Team Liquid" }, { name: "Fnatic" }] } as Match;
const event: OddsEvent = { id: 1, home: "Fnatic", away: "Team Liquid", date: "2026-09-28T12:00:00Z", league: { name: "Valorant Champions Tour" } };

test("odds events stay within the correct game and match reversed teams", () => {
  assert.equal(eventGame(event), "valorant");
  assert.equal(matchOddsEvent(match, event, "valorant"), "reversed");
  assert.equal(matchOddsEvent(match, event, "lol"), null);
  assert.equal(matchOddsEvent(match, { ...event, league: { name: "Esports" } }, "valorant"), null);
});

test("odds average uses valid match-winner prices and the correct team side", () => {
  const result = { id: 1, bookmakers: { Bet365: [{ name: "ML", updatedAt: "2026-09-28T12:01:00Z", odds: [{ home: "1.50", away: "2.50" }] }], Unibet: [{ name: "ML", odds: [{ home: "1.70", away: "2.30" }] }] } };
  assert.deepEqual(marketAverage(result, "reversed"), { bookmaker: "Market average", home: 2.4, away: 1.6, updatedAt: "2026-09-28T12:01:00Z" });
  assert.equal(marketAverage({ id: 1, bookmakers: {} }, "same"), null);
});
