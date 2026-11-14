import { snapshotDetails, type StatGroup } from "./final-details.ts";
import type { Match } from "./matches.ts";
import { isWorlds2026Match } from "./worlds.ts";

export type FinalPlayer = { details?: StatGroup; id: string; name: string; kills?: number; deaths?: number; assists?: number; netWorth?: number; champion?: string; damage?: number; vision?: number; goldEarned?: number };
export type FinalTeam = { details?: StatGroup; id: string; name: string; score?: number; won?: boolean; kills?: number; deaths?: number; assists?: number; netWorth?: number; players: FinalPlayer[]; objectives: { name: string; count: number }[] };
export type FinalGame = { details?: StatGroup; id: string; number: number; started: boolean; finished: boolean; seconds?: number; teams: FinalTeam[] };
export type FinalState = { details?: StatGroup; id: string; started: boolean; finished: boolean; updatedAt?: string; teams: FinalTeam[]; games: FinalGame[] };
export type FinalFeed = { coverage?: "full" | "basic"; status: "ready" | "not-configured" | "unavailable" | "pending"; state: FinalState | null; fetchedAt: string | null };

export function findWorldsFinal(matches: Match[]) {
  return matches.filter(match => isWorlds2026Match(match) && !/play[ -]?in|qualif/i.test(match.tournament) && (
    match.beginAt.startsWith("2026-11-14") ||
    /(?:^|\b)(?:grand final|final)(?:\b|$)/i.test(match.name.replace(/(?:semi|quarter)[ -]?finals?/gi, ""))
  )).sort((a, b) => (Date.parse(b.beginAt) || 0) - (Date.parse(a.beginAt) || 0))[0];
}

type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const rows = (value: unknown) => Array.isArray(value) ? value.map(row) : [];
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
const string = (value: unknown) => typeof value === "string" ? value : undefined;

function team(value: Row, names: Record<string, string> = {}): FinalTeam {
  return {
    details: snapshotDetails(value, ["name", "players", "kills", "deaths", "killAssistsGiven", "netWorth"], names),
    id: String(value.id ?? ""), name: string(value.name) ?? "Team pending", score: number(value.score),
    won: typeof value.won === "boolean" ? value.won : undefined,
    kills: number(value.kills), deaths: number(value.deaths), assists: number(value.killAssistsGiven), netWorth: number(value.netWorth),
    objectives: rows(value.objectives).flatMap(objective => {
      const count = number(objective.completionCount);
      return typeof objective.type === "string" && count !== undefined ? [{ name: objective.type.replace(/([a-z])([A-Z])/g, "$1 $2"), count }] : [];
    }),
    players: rows(value.players).map(player => ({
      details: snapshotDetails(player, ["name", "character", "kills", "deaths", "killAssistsGiven", "netWorth", "damageDealt", "visionScore", "totalMoneyEarned"], names),
      id: String(player.id ?? ""), name: string(player.name) ?? "Player pending",
      kills: number(player.kills), deaths: number(player.deaths), assists: number(player.killAssistsGiven),
      netWorth: number(player.netWorth), champion: string(row(player.character).name),
      damage: number(player.damageDealt), vision: number(player.visionScore), goldEarned: number(player.totalMoneyEarned),
    })),
  };
}

export function normalizeFinalState(value: unknown): FinalState | null {
  const state = row(value);
  if (!state.id || state.valid === false || rows(state.teams).length !== 2) return null;
  const names: Record<string, string> = {};
  for (const t of [...rows(state.teams), ...rows(state.games).flatMap(g => rows(g.teams))]) {
    if (typeof t.name === "string") names[String(t.id)] = t.name;
    for (const p of rows(t.players)) if (typeof p.name === "string") names[String(p.id)] = p.name;
  }
  const teams = rows(state.teams).map(t => team(t, names));
  if (teams.some(team => !team.id) || teams[0].id === teams[1].id) return null;
  return {
    details: snapshotDetails(state, ["teams", "games", "started", "finished", "updatedAt", "title"], names),
    id: String(state.id), started: state.started === true, finished: state.finished === true,
    updatedAt: typeof state.updatedAt === "string" && Number.isFinite(Date.parse(state.updatedAt)) ? state.updatedAt : undefined,
    teams,
    games: rows(state.games).flatMap(game => {
      const sequence = number(game.sequenceNumber);
      if (!game.id || !sequence) return [];
      const gameTeams = rows(game.teams).map(t => team(t, names)).map(item => ({ ...item, name: teams.find(parent => parent.id === item.id)?.name ?? item.name }));
      return [{ details: snapshotDetails(game, ["teams", "sequenceNumber", "started", "finished", "clock"], names), id: String(game.id), number: sequence, started: game.started === true, finished: game.finished === true, seconds: number(row(game.clock).currentSeconds), teams: gameTeams }];
    }).sort((a, b) => a.number - b.number),
  };
}
