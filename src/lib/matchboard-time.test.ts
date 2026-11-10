import test from "node:test";
import assert from "node:assert/strict";
import { startsIn, timeLabel, updatedTimeLabel } from "./matchboard-time.ts";

const kickoff = "2026-11-11T00:30:00Z";

test("server and first hydration labels are identical across timezones", () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = "UTC";
    const server = [timeLabel(kickoff, "upcoming"), timeLabel(kickoff, "finished"), updatedTimeLabel(kickoff), startsIn(kickoff, null)];
    for (const zone of ["America/Los_Angeles", "Europe/Bucharest", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      assert.deepEqual([timeLabel(kickoff, "upcoming"), timeLabel(kickoff, "finished"), updatedTimeLabel(kickoff), startsIn(kickoff, null)], server);
    }
    assert.ok(server[0].endsWith(" UTC"));
    assert.equal(server[3], "—");
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test("local labels are enabled explicitly after hydration", () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    assert.notEqual(timeLabel(kickoff, "upcoming", true), timeLabel(kickoff, "upcoming"));
    assert.notEqual(updatedTimeLabel(kickoff, true), updatedTimeLabel(kickoff));
    assert.equal(timeLabel(kickoff, "upcoming", true).includes("UTC"), false);
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test("countdowns use the explicit client clock, including minute boundaries and stale HTML", () => {
  const begin = Date.parse(kickoff);
  assert.equal(startsIn(kickoff, null), "—");
  assert.equal(startsIn(kickoff, begin - 60_001), "2M");
  assert.equal(startsIn(kickoff, begin - 60_000), "1M");
  assert.equal(startsIn(kickoff, begin - 3_600_000), "1H 0M");
  assert.equal(startsIn(kickoff, begin - 86_400_000), "1D 0H");
  assert.equal(startsIn(kickoff, begin + 60_000), "0M");
});

test("live and missing dates retain safe labels", () => {
  assert.equal(timeLabel("", "running"), "LIVE NOW");
  for (const value of ["", "invalid"]) {
    assert.equal(timeLabel(value, "upcoming"), "DATE TBD");
    assert.equal(updatedTimeLabel(value), "TIME TBD");
    assert.equal(startsIn(value, null), "TBD");
    assert.equal(startsIn(value, Date.now()), "TBD");
  }
});
