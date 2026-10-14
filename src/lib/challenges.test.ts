import test from "node:test";
import assert from "node:assert/strict";
import { champions, dailyChampion, dayKey, memoryDeck, normalizeGuess, readProgress, scramble } from "./challenges.ts";

test("daily games use UTC consistently across local timezones", () => {
  assert.equal(dayKey(new Date("2026-10-15T01:00:00+03:00")), "2026-10-14");
  assert.equal(dayKey(new Date("2026-10-15T03:00:00+03:00")), "2026-10-15");
  assert.deepEqual(dailyChampion("2026-10-14", "clues"), dailyChampion("2026-10-14", "clues"));
  assert.notDeepEqual(dailyChampion("2026-10-14", "clues"), dailyChampion("2026-10-15", "clues"));
});

test("scrambles retain all letters without exposing the original name", () => {
  for (const champion of champions) {
    for (let day = 1; day <= 31; day++) {
      const mixed = scramble(champion.name, `2026-10-${day}`);
      assert.notEqual(mixed, champion.name.toUpperCase());
      assert.deepEqual([...mixed].sort(), [...champion.name.toUpperCase()].sort());
    }
  }
  assert.equal(normalizeGuess("  aHrI  "), "ahri");
});

test("daily memory decks contain six pairs and preserve their order on reload", () => {
  const deck = memoryDeck("2026-10-14");
  assert.equal(deck.length, 12);
  assert.equal(new Set(deck).size, 6);
  for (const name of deck) assert.equal(deck.filter(item => item === name).length, 2);
  assert.deepEqual(deck, memoryDeck("2026-10-14"));
  assert.notDeepEqual(deck, memoryDeck("2026-10-15"));
});

test("saved progress survives reload and malformed browser data resets safely", () => {
  const day = "2026-10-14";
  const name = memoryDeck(day)[0];
  const progress = { guesses: ["Lux", "Ahri"], matched: [name], moves: 3 };
  assert.deepEqual(readProgress(JSON.stringify(progress), day), progress);
  const empty = { guesses: [], matched: [], moves: 0 };
  for (const raw of [null, "broken", "null", "{}", '{"guesses":[5],"matched":[],"moves":0}', JSON.stringify({ ...progress, matched: ["Invalid"] }), JSON.stringify({ ...progress, moves: -1 }), JSON.stringify({ ...progress, guesses: ["a", "b", "c", "d"] })]) {
    assert.deepEqual(readProgress(raw, day), empty);
  }
});
