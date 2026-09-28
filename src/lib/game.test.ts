import test from "node:test";
import assert from "node:assert/strict";
import { followedTeamKey, gamePath, rateValorantMatch } from "./game.ts";

test("keeps game URLs and follows separate while preserving existing LoL IDs", () => {
  assert.equal(gamePath("lol"), "");
  assert.equal(gamePath("valorant"), "/valorant");
  assert.equal(followedTeamKey("lol", 123), "123");
  assert.equal(followedTeamKey("valorant", 123), "valorant:123");
});

test("does not mistake the Valorant Champions Tour for the international Champions event", () => {
  assert.deepEqual(rateValorantMatch("Valorant Champions Tour Americas Stage 1"), { stars: 3, reason: "VCT match" });
  assert.deepEqual(rateValorantMatch("VCT Masters Grand Final"), { stars: 5, reason: "International playoffs" });
  assert.deepEqual(rateValorantMatch("Valorant Champions 2026"), { stars: 4, reason: "International event" });
});
