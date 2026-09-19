import test from "node:test";
import assert from "node:assert/strict";
import { layoutBracket, roundLabel, scoreFor } from "./bracket.ts";

test("preserves numbered rounds and maps live scores by team identity", () => {
  assert.equal(roundLabel({ id: 1, name: "Upper Round 2: A vs B" }), "Upper Round 2");
  const match = { id: 1, status: "running", opponents: [{ opponent: { id: 10 } }, { opponent: { id: 20 } }], results: [{ team_id: 20, score: 2 }, { team_id: 10, score: 1 }] };
  assert.equal(scoreFor(match, 0), 1);
  assert.equal(scoreFor(match, 1), 2);
  assert.equal(scoreFor({ ...match, status: "not_started" }, 0), undefined);
});

test("orders dependency rounds and connects actual feeders despite shuffled input", () => {
  const [lane] = layoutBracket([
    { id: 3, name: "Final", previous_matches: [{ match_id: 1 }, { match_id: 2 }] },
    { id: 2, name: "Semifinals" }, { id: 1, name: "Semifinals" },
  ]);
  assert.deepEqual(lane.rounds.map(round => round.map(match => match.id)), [[1, 2], [3]]);
  assert.equal(lane.edges.length, 2);
  assert.equal(lane.positions.get(3)?.y, (lane.positions.get(1)!.y + lane.positions.get(2)!.y) / 2);
});

test("unifies lower rounds and never invents connections from card order", () => {
  const lanes = layoutBracket([{ id: 1, name: "Upper Round 1" }, { id: 2, name: "Lower Round 1" }, { id: 3, name: "Grand Final" }]);
  assert.equal(lanes.length, 1);
  assert.equal(lanes[0].positions.size, 3);
  assert.ok(lanes[0].positions.get(2)!.y > lanes[0].positions.get(1)!.y);
  assert.ok(lanes[0].positions.get(3)!.x > lanes[0].positions.get(1)!.x);
  assert.equal(lanes.flatMap(lane => lane.edges).length, 0);
});

test("connects loser drops and both finalists on the same board", () => {
  const [board] = layoutBracket([
    { id: 4, name: "Grand Final", previous_matches: [{ match_id: 2 }, { match_id: 3 }] },
    { id: 3, name: "Lower Final", previous_matches: [{ match_id: 2, type: "loser" }, { match_id: 1, type: "loser" }] },
    { id: 2, name: "Upper Final", previous_matches: [{ match_id: 1 }] },
    { id: 1, name: "Upper Round 1" },
  ]);
  assert.equal(board.edges.length, 5);
  assert.equal(board.edges.filter(edge => edge.loser).length, 2);
  assert.ok(board.edges.every(edge => edge.from.x < edge.to.x));
  assert.deepEqual(layoutBracket([]), []);
});
