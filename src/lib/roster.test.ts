import test from "node:test";
import assert from "node:assert/strict";
import { renderedRosterFixtures } from "./fixtures/rosters.ts";
import { parseCargoRoster, parseRenderedRosterHtml } from "./roster.ts";

test("parses saved Leaguepedia roster fixtures", () => {
  for (const [team, html] of Object.entries(renderedRosterFixtures)) {
    const roster = parseRenderedRosterHtml(html);
    assert.ok(roster.length > 0, `${team} should contain players`);
    assert.ok(roster.every((player) => player.nickname && player.role), `${team} should preserve names and roles`);
  }
});

test("keeps Ghost at bot and Pollu at support", () => {
  const roster = parseRenderedRosterHtml(renderedRosterFixtures["KT Rolster Challengers"]);
  assert.deepEqual(roster.map(({ nickname, role }) => [nickname, role]), [["Ghost", "Bot Laner"], ["Pollu", "Support"]]);
});

test("marks Cargo substitutes and retains matching PandaScore identity", () => {
  const roster = parseCargoRoster([{ title: { Link: "Player One", Role: "Jungle", IsSubstitute: "1" } }], [{ id: 42, nickname: "Player One", image_url: "player.png" }]);
  assert.equal(roster[0].id, 42);
  assert.equal(roster[0].substitute, true);
  assert.equal(roster[0].image_url, "player.png");
});
