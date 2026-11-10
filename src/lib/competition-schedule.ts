import type { Match } from "./matches.ts";

/** Newer details own status/scores, but an empty provider stream list must not erase a verified feed fallback. */
export function mergeCompetitionMatches(feed: Match[], details: Match[]) {
  const merged = new Map(feed.map(match => [match.id, match]));
  for (const match of details) {
    const previous = merged.get(match.id);
    merged.set(match.id, { ...match, streams: match.streams.length ? match.streams : previous?.streams ?? [] });
  }
  return [...merged.values()];
}

/** Keep live matches out of completed results and never infer a winner mid-series. */
export function competitionSchedule(matches: Match[]) {
  const unique = [...new Map(matches.map(match => [match.id, match])).values()];
  const start = (match: Match, fallback: number) => {
    const value = Date.parse(match.beginAt);
    return Number.isFinite(value) ? value : fallback;
  };
  const ascending = (a: Match, b: Match) => start(a, Infinity) - start(b, Infinity) || a.id - b.id;
  return {
    live: unique.filter(match => match.status === "running").sort(ascending),
    upcoming: unique.filter(match => match.status === "upcoming").sort(ascending),
    results: unique.filter(match => match.status === "finished").sort((a, b) => start(b, -Infinity) - start(a, -Infinity) || b.id - a.id),
  };
}

export function hasWonSeries(match: Pick<Match, "status" | "opponents">, teamIndex: number) {
  if (match.status !== "finished" || match.opponents.length !== 2 || teamIndex < 0 || teamIndex > 1) return false;
  const score = match.opponents[teamIndex]?.score;
  const other = match.opponents[1 - teamIndex]?.score;
  return typeof score === "number" && typeof other === "number" && Number.isFinite(score) && Number.isFinite(other) && score > other;
}
