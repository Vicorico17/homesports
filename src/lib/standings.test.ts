import test from "node:test";
import assert from "node:assert/strict";
import { deriveStandings, numericStat } from "./standings.ts";

test("preserves zero and leaves absent standings unknown", () => {
  assert.equal(numericStat("0"), 0);
  for (const value of [null, undefined, "", "unknown", NaN]) assert.equal(numericStat(value), undefined);
});
test("counts complete results by team ID, ignoring duplicate, tied and missing scores", () => {
  const base = { id: 1, status: "finished", opponents: [{ opponent: { id: 10, name: "A" } }, { opponent: { id: 20, name: "B" } }], results: [{ team_id: 20, score: 0 }, { team_id: 10, score: 2 }] };
  const rows = deriveStandings([base, base, { ...base, id: 2, results: [] }, { ...base, id: 3, results: [{ team_id: 10, score: 1 }, { team_id: 20, score: 1 }] }]);
  assert.deepEqual(rows.map(row => [row.team.id, row.wins, row.losses]), [[10, 1, 0], [20, 0, 1]]);
});
