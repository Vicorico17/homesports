import type { Match } from "./matches.ts";

export type WorldsStage = "Play-in" | "Swiss" | "Knockout" | "Other";
export const worldsStageOrder: WorldsStage[] = ["Play-in", "Swiss", "Knockout", "Other"];

export function isWorlds2026Match(match: Match) {
  const label = [match.league, match.serie, match.tournament].join(" ");
  if (!/worlds|world championship/i.test(label)) return false;
  const years = label.match(/\b20\d{2}\b/g) ?? [];
  if (years.length) return years.every(year => year === "2026");
  return match.beginAt ? new Date(match.beginAt).getUTCFullYear() === 2026 : false;
}

export function worldsStage(match: Match): WorldsStage {
  const label = match.tournament.toLowerCase();
  if (/play[ -]?in|qualif/.test(label)) return "Play-in";
  if (/swiss/.test(label)) return "Swiss";
  if (/knockout|quarter|semi|final|playoff|bracket/.test(label)) return "Knockout";
  return "Other";
}

export function swissRecords(matches: Match[]) {
  const records = new Map<string, { id?: number; name: string; wins: number; losses: number }>();
  for (const match of new Map(matches.map(match => [match.id, match])).values()) {
    if (worldsStage(match) !== "Swiss" || match.status !== "finished" || match.opponents.length !== 2) continue;
    const [a, b] = match.opponents;
    if (a.score == null || b.score == null || a.score === b.score) continue;
    for (const [team, other] of [[a, b], [b, a]]) {
      const key = team.id != null ? String(team.id) : team.name.toLowerCase();
      const row = records.get(key) ?? { id: team.id, name: team.name, wins: 0, losses: 0 };
      if (team.score! > other.score!) row.wins += 1; else row.losses += 1;
      records.set(key, row);
    }
  }
  return [...records.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
}
