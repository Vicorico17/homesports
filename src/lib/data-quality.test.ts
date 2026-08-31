import test from "node:test";
import assert from "node:assert/strict";
import { canonicalRole, competitionMatchScore, isVerifiedPlayoffMatch, validDate } from "./data-quality.ts";

test("rejects placeholder and malformed dates", () => {
  assert.equal(validDate("1970-01-01T00:00:00Z"), false);
  assert.equal(validDate("not-a-date"), false);
  assert.equal(validDate("2026-08-31T12:00:00Z"), true);
});

test("maps only recognized roster roles", () => {
  assert.equal(canonicalRole("Jungler"), "jungle");
  assert.equal(canonicalRole("jun"), "jungle");
  assert.equal(canonicalRole("Bot Lane"), "adc");
  assert.equal(canonicalRole("Coach"), undefined);
});

test("does not match competitions from different seasons", () => {
  assert.equal(competitionMatchScore("LCK 2026 Season", "LCK 2025 Season"), 0);
  assert.equal(competitionMatchScore("LEC 2026 Summer", "LEC 2026 Summer"), 100);
  assert.equal(competitionMatchScore("LCK", "LCK Challengers League"), 0);
});

test("accepts explicit playoff rounds and rejects regular-season finals wording", () => {
  assert.equal(isVerifiedPlayoffMatch({ Phase: "Playoffs", Round: "Upper Semifinal", Team1: "T1", Team2: "Gen.G" }), true);
  assert.equal(isVerifiedPlayoffMatch({ Phase: "Regular Season", Round: "Week 9", Team1: "T1", Team2: "Gen.G" }), false);
  assert.equal(isVerifiedPlayoffMatch({ Phase: "Playoffs", Round: "Final" }), false);
});
