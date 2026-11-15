import type { FinalFeed } from "./worlds-final.ts";
// Verified against Central Data in the original final integration and a completed
// production Series State snapshot on 2026-11-15. Not a cross-provider ID mapping.
export const verifiedGridHistory = [{ id: "3012986", title: "Worlds 2026 final", date: "2026-11-14", teams: ["Gen.G Esports", "BILIBILI GAMING"] }];
export function verifiedHistoricalSeries(id: string, feed: FinalFeed) {
  const record = verifiedGridHistory.find(item => item.id === id);
  if (!record || feed.status !== "ready" || feed.state?.id !== id || !feed.state.finished) return null;
  const names = feed.state.teams.map(team => team.name).sort();
  return names.length === 2 && record.teams.slice().sort().every((name, i) => name === names[i]) ? record : null;
}
