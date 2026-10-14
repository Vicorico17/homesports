import test from "node:test";
import assert from "node:assert/strict";
import { champions, findChampion, portraitPath, dailyChampion, dailyStorageKey, dayKey, resetCountdown, memoryDeck, normalizeGuess, readProgress, scramble } from "./challenges.ts";

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
      assert.notEqual(mixed, normalizeGuess(champion.name).toUpperCase());
      assert.deepEqual([...mixed].sort(), [...normalizeGuess(champion.name).toUpperCase()].sort());
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


test("recognizes punctuation and spacing in champion guesses", () => {
  assert.equal(findChampion(" kai sa ")?.name, "Kai'Sa");
  assert.equal(findChampion("CHO'GATH")?.id, "Chogath");
  assert.equal(findChampion("lee sin")?.id, "LeeSin");
  assert.equal(findChampion("Wukong")?.id, "MonkeyKing");
  assert.equal(findChampion("not a champion"), undefined);
});

test("all puzzles have real champion portraits and ultimate data", () => {
  assert.ok(champions.length >= 40);
  for (const champion of champions) {
    assert.ok(findChampion(champion.name));
    assert.ok(champion.ability.name);
    assert.equal(champion.ability.slot, "R");
    assert.equal(champion.clues.length, 3);
    assert.ok(champion.roles.length > 0);
    assert.equal(portraitPath(champion.name), `/league/champions/${champion.id}.png`);
  }
  for (const mode of ["clues", "scramble", "ability", "title"] as const) {
    assert.ok(champions.includes(dailyChampion("2026-10-14", mode)));
  }
  assert.equal(portraitPath("invalid"), undefined);
});


test("each guessing mode rotates through the full pool without daily repeats", () => {
  const epoch = Date.UTC(2026, 11, 15);
  for (const mode of ["clues", "scramble", "ability", "title"] as const) {
    const cycle = Array.from({ length: champions.length }, (_, index) => dailyChampion(dayKey(new Date(epoch + index * 86_400_000)), mode).name);
    assert.equal(new Set(cycle).size, champions.length);
  }
  for (let index = 0; index < 370; index++) {
    const day = dayKey(new Date(epoch + index * 86_400_000));
    const tomorrow = dayKey(new Date(epoch + (index + 1) * 86_400_000));
    const answers = (["clues", "scramble", "ability", "title"] as const).map(mode => dailyChampion(day, mode).name);
    assert.equal(new Set(answers).size, 4);
    const todayPairs = new Set(memoryDeck(day));
    assert.equal(todayPairs.size, 6);
    assert.equal(new Set(memoryDeck(tomorrow)).size, 6);
    assert.ok(memoryDeck(tomorrow).every(name => !todayPairs.has(name)));
  }
});

test("midnight countdown and progress keys roll over together across years and leap days", () => {
  for (const [before, after] of [["2026-12-31", "2027-01-01"], ["2028-02-28", "2028-02-29"], ["2028-02-29", "2028-03-01"]]) {
    const lastMoment = new Date(`${before}T23:59:59.500Z`);
    const midnight = new Date(lastMoment.getTime() + 500);
    assert.equal(resetCountdown(lastMoment), "00:00:01");
    assert.equal(resetCountdown(midnight), "24:00:00");
    assert.equal(dayKey(midnight), after);
    assert.notEqual(dailyStorageKey(dayKey(lastMoment), "clues"), dailyStorageKey(dayKey(midnight), "clues"));
    assert.notEqual(dailyChampion(before, "clues").name, dailyChampion(after, "clues").name);
  }
  assert.equal(resetCountdown(new Date("2026-10-14T12:34:56Z")), "11:25:04");
  assert.notEqual(dailyStorageKey("2026-10-14", "clues"), dailyStorageKey("2026-10-14", "title"));
});
