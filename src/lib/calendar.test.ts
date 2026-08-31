import test from "node:test";
import assert from "node:assert/strict";
import { buildTeamCalendar } from "./calendar.ts";

test("builds a valid team calendar and omits invalid dates", () => {
  const calendar = buildTeamCalendar("T1", [
    { id: 1, begin_at: "2026-09-01T12:00:00Z", opponents: [{ opponent: { name: "T1" } }, { opponent: { name: "Gen.G" } }], league: { name: "LCK" } },
    { id: 2, begin_at: "1970-01-01T00:00:00Z", name: "Placeholder" },
  ], "https://homesports.example");
  assert.match(calendar, /BEGIN:VCALENDAR/);
  assert.match(calendar, /SUMMARY:T1 vs Gen\.G/);
  assert.match(calendar, /DTSTART:20260901T120000Z/);
  assert.doesNotMatch(calendar, /Placeholder/);
});
