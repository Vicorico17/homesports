import type { BracketMatch } from "./bracket.ts";
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
  if (/swiss/.test(label) || (isWorlds2026Match(match) && /group[ -]?stage/.test(label))) return "Swiss";
  if (/knockout|quarter|semi|final|playoff|bracket/.test(label)) return "Knockout";
  return "Other";
}

export function swissRecords(matches: Match[]) {
  const records = new Map<string, { id?: number; name: string; imageUrl?: string | null; wins: number; losses: number }>();
  for (const match of new Map(matches.map(match => [match.id, match])).values()) {
    if (worldsStage(match) !== "Swiss" || match.status !== "finished" || match.opponents.length !== 2) continue;
    const [a, b] = match.opponents;
    if (a.score == null || b.score == null || a.score === b.score) continue;
    for (const [team, other] of [[a, b], [b, a]]) {
      const key = team.id != null ? String(team.id) : team.name.toLowerCase();
      const row = records.get(key) ?? { id: team.id, name: team.name, imageUrl: team.imageUrl, wins: 0, losses: 0 };
      if (!row.imageUrl && team.imageUrl) row.imageUrl = team.imageUrl;
      if (team.score! > other.score!) row.wins += 1; else row.losses += 1;
      records.set(key, row);
    }
  }
  return [...records.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
}


export type WorldsData = {
  matches: Match[];
  brackets: { tournamentId: number; stage: WorldsStage; matches: BracketMatch[]; available: boolean }[];
  updatedAt: string;
  sourceStatus: string;
  complete: boolean;
};

export function groupWorldsMatches(matches: Match[]) {
  const groups = new Map<string, Match[]>();
  const sorted = [...new Map(matches.map(match => [match.id, match])).values()].sort((a, b) => (Date.parse(a.beginAt) || Infinity) - (Date.parse(b.beginAt) || Infinity) || a.id - b.id);
  for (const match of sorted) {
    // Prefer explicit round/group labels; a UTC date is a grouping, not an inferred round.
    const round = match.name.match(/(?:swiss\s+)?round\s+\d+|group\s+[a-h]\b|quarter[ -]?finals?|semi[ -]?finals?|grand final|upper[^:]*|lower[^:]*/i)?.[0];
    const key = round || (Number.isFinite(Date.parse(match.beginAt)) ? new Date(match.beginAt).toISOString().slice(0, 10) : "Schedule pending");
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }
  return [...groups].map(([label, matches]) => ({ label, matches }));
}

export function filterWorldsMatches(matches: Match[], filters: { league: string; minimum: number; query: string }) {
  const query = filters.query.trim().toLowerCase();
  return matches.filter(match => isWorlds2026Match(match) && (filters.league === "all" || match.league === filters.league) && match.importance >= filters.minimum && (!query || [match.name, match.league, match.serie, match.tournament, ...match.opponents.map(team => team.name)].some(value => value.toLowerCase().includes(query))));
}
