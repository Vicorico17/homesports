import test from "node:test";
import assert from "node:assert/strict";
import { isMatchGame, predictionCutoff, recentForm, formWinChances, type FormMatch } from "./match-preview.ts";

const cutoff = Date.parse("2026-10-15T18:00:00Z");
function match(id: number, win = true): FormMatch {
  return { id, name: "A vs B", status: "finished", number_of_games: 3, videogame: { slug: "lol" }, end_at: `2026-10-${String(id).padStart(2, "0")}T12:00:00Z`, opponents: [{ opponent: { id: 1, name: "A" } }, { opponent: { id: 2, name: "B" } }], results: [{ team_id: 2, score: win ? 0 : 2 }, { team_id: 1, score: win ? 2 : 0 }] };
}

test("form uses latest ten completed series and maps reversed scores by team ID", () => {
  const history = Array.from({ length: 12 }, (_, index) => match(index + 1, index % 2 === 0));
  const form = recentForm([...history, history[0]], 1, "lol", cutoff, 99);
  assert.equal(form.results.length, 10);
  assert.deepEqual(form.results.slice(0, 3), ["L", "W", "L"]);
  assert.equal(form.wins, 5);
  assert.equal(form.losses, 5);
});

test("rejects other games, current series, future, stale, unscored and tied matches", () => {
  const valid = match(1);
  const history: FormMatch[] = [valid, { ...match(2), videogame: { slug: "valorant" } }, { ...match(3), status: "running" }, { ...match(4), end_at: "2026-10-16T00:00:00Z" }, { ...match(5), end_at: null }, { ...match(6), end_at: "2025-01-01T00:00:00Z" }, { ...match(7), results: [] }, { ...match(8), results: [{ team_id: 1, score: 1 }, { team_id: 2, score: 1 }] }, match(9)];
  assert.deepEqual(recentForm(history, 1, "lol", cutoff, 9), { wins: 1, losses: 0, results: ["W"] });
  assert.deepEqual(recentForm([valid], 99, "lol", cutoff, 9).results, []);
  assert.deepEqual(recentForm([valid], 1, "lol", NaN, 9).results, []);
});

test("estimates are complementary, symmetric and withheld for insufficient history", () => {
  const strong = { wins: 8, losses: 2, results: [] };
  const weak = { wins: 2, losses: 8, results: [] };
  const chance = formWinChances(strong, weak)!;
  assert.equal(chance[0] + chance[1], 100);
  assert.ok(chance[0] > 50 && chance[0] < 100);
  assert.deepEqual(formWinChances(weak, strong), [chance[1], chance[0]]);
  assert.deepEqual(formWinChances(strong, strong), [50, 50]);
  assert.equal(formWinChances(strong, { wins: 4, losses: 0, results: [] }), null);
});


test("forecast cutoff excludes results after now or after the series started", () => {
  assert.equal(predictionCutoff("2026-10-16T18:00:00Z", cutoff), cutoff);
  assert.equal(predictionCutoff("2026-10-14T18:00:00Z", cutoff), cutoff - 86_400_000);
  assert.ok(Number.isNaN(predictionCutoff("", cutoff)));
});


test("recognizes the provider's League slug without accepting another game's fixture", () => {
  const leagueMatch = { ...match(1), videogame: { slug: "league-of-legends" } };
  assert.equal(isMatchGame(leagueMatch, "lol"), true);
  assert.equal(isMatchGame(leagueMatch, "valorant"), false);
  assert.equal(isMatchGame({ ...match(1), videogame: undefined }, "lol"), false);
  assert.equal(recentForm([leagueMatch], 1, "lol", cutoff, 99).wins, 1);
});
