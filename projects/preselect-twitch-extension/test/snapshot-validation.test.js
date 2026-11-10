import test from "node:test";
import assert from "node:assert/strict";
import { DraftEngine } from "../src/draft-engine.js";

function live() {
  const engine = new DraftEngine({ now: () => 1000 });
  engine.createMatch({ blueTeam: "Blue", redTeam: "Red" });
  engine.join("Uviewer", "Viewer"); engine.startDraft();
  return engine;
}

test("corrupt and oversized imported snapshots leave the live engine unchanged", () => {
  const engine = live();
  const original = structuredClone(engine.snapshot());
  for (const change of [
    value => { value.viewers[0][1].name = {}; },
    value => { value.viewers[0][1].seriesScore = -1; },
    value => { value.round.status = "resolved"; },
    value => { value.predictions = [[value.round.id, [["someone-else", "Ahri"]]]]; },
    value => { value.currentIndex = 10; },
    value => { value.roundSeconds = null; },
    value => { value.viewers = Array(5001).fill(value.viewers[0]); },
    value => { value.viewers[0][0] = value.viewers[0][1].id = "Aanonymous"; },
  ]) {
    const invalid = structuredClone(original); change(invalid);
    assert.throws(() => engine.restore(invalid), /Invalid recovery snapshot/);
    assert.deepEqual(engine.snapshot(), original);
  }
});

test("undo discards obsolete prediction rounds instead of growing history indefinitely", () => {
  const engine = live();
  for (let index = 0; index < 50; index++) { engine.resolve("Ahri"); engine.undoLast(); }
  assert.equal(engine.predictions.size, 1);
  const restored = new DraftEngine(); restored.restore(engine.snapshot());
  assert.equal(restored.currentIndex, 0);
});

test("invalid match settings do not partially overwrite a configured series", () => {
  const engine = live(); const before = structuredClone(engine.snapshot());
  for (const fields of [{ roundSeconds: "NaN" }, { bestOf: 2 }, { blueTeam: {} }, { revealDelaySeconds: -1 }]) {
    assert.throws(() => engine.createMatch({ blueTeam: "Blue", redTeam: "Red", ...fields }));
    assert.deepEqual(engine.snapshot(), before);
  }
});
