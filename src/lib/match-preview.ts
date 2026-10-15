import type { Game } from "./game.ts";
import type { PandaMatch } from "./matches.ts";

export type TeamForm = { wins: number; losses: number; results: ("W" | "L")[] };
export type FormMatch = PandaMatch & { end_at?: string | null };

export function isMatchGame(match: PandaMatch, game: Game) {
  return game === "lol" ? ["lol", "league-of-legends"].includes(match.videogame?.slug ?? "") : match.videogame?.slug === "valorant";
}

export function recentForm(matches: FormMatch[], teamId: number, game: Game, cutoff: number, excludeId: number): TeamForm {
  const eligible = [...new Map(matches.map(match => [match.id, match])).values()]
    .filter(match => match.id !== excludeId && match.status === "finished" && isMatchGame(match, game) && match.opponents?.length === 2 && Number.isFinite(Date.parse(match.end_at ?? "")) && Date.parse(match.end_at!) < cutoff && Date.parse(match.end_at!) >= cutoff - 180 * 86_400_000)
    .sort((a, b) => Date.parse(b.end_at!) - Date.parse(a.end_at!));
  const results: ("W" | "L")[] = [];
  for (const match of eligible) {
    const ids = match.opponents!.map(item => item.opponent?.id);
    if (!ids.includes(teamId)) continue;
    const otherId = ids.find(id => id != null && id !== teamId);
    if (otherId == null) continue;
    const mine = match.results?.find(result => result.team_id === teamId)?.score;
    const theirs = match.results?.find(result => result.team_id === otherId)?.score;
    if (mine == null || theirs == null || !Number.isInteger(mine) || !Number.isInteger(theirs) || mine < 0 || theirs < 0 || mine === theirs) continue;
    results.push(mine > theirs ? "W" : "L");
    if (results.length === 10) break;
  }
  return { wins: results.filter(result => result === "W").length, losses: results.filter(result => result === "L").length, results };
}

// A transparent, uncalibrated form estimate: two prior wins/losses per team,
// then compare the smoothed win/loss odds. No bookmaker or live-game inputs.
export function formWinChances(home: TeamForm, away: TeamForm): [number, number] | null {
  if (home.wins + home.losses < 5 || away.wins + away.losses < 5) return null;
  const a = (home.wins + 2) / (home.wins + home.losses + 4);
  const b = (away.wins + 2) / (away.wins + away.losses + 4);
  const homeChance = Math.round(100 * (a * (1 - b)) / (a * (1 - b) + b * (1 - a)));
  return [homeChance, 100 - homeChance];
}


export function predictionCutoff(beginAt: string, now = Date.now()) {
  const start = Date.parse(beginAt);
  return Number.isFinite(start) ? Math.min(start, now) : NaN;
}
