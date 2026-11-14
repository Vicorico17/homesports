import type { Match } from "./matches.ts";
import { isWorlds2026Match } from "./worlds.ts";

export type FinalPlayer = { id: string; name: string; kills?: number; deaths?: number; assists?: number; netWorth?: number; champion?: string; damage?: number; vision?: number; goldEarned?: number };
export type FinalTeam = { id: string; name: string; score?: number; won?: boolean; kills?: number; deaths?: number; assists?: number; netWorth?: number; players: FinalPlayer[]; objectives: { name: string; count: number }[] };
export type FinalGame = { id: string; number: number; started: boolean; finished: boolean; seconds?: number; teams: FinalTeam[] };
export type FinalState = { id: string; started: boolean; finished: boolean; updatedAt?: string; teams: FinalTeam[]; games: FinalGame[] };
export type FinalFeed = { status: "ready" | "not-configured" | "unavailable" | "pending"; state: FinalState | null; fetchedAt: string | null };

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

function team(value: Row): FinalTeam {
  return {
    id: String(value.id ?? ""), name: string(value.name) ?? "Team pending", score: number(value.score),
    won: typeof value.won === "boolean" ? value.won : undefined,
    kills: number(value.kills), deaths: number(value.deaths), assists: number(value.killAssistsGiven), netWorth: number(value.netWorth),
    objectives: rows(value.objectives).flatMap(objective => {
      const count = number(objective.completionCount);
      return typeof objective.type === "string" && count !== undefined ? [{ name: objective.type.replace(/([a-z])([A-Z])/g, "$1 $2"), count }] : [];
    }),
    players: rows(value.players).map(player => ({
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
  const teams = rows(state.teams).map(team);
  if (teams.some(team => !team.id) || teams[0].id === teams[1].id) return null;
  return {
    id: String(state.id), started: state.started === true, finished: state.finished === true,
    updatedAt: typeof state.updatedAt === "string" && Number.isFinite(Date.parse(state.updatedAt)) ? state.updatedAt : undefined,
    teams,
    games: rows(state.games).flatMap(game => {
      const sequence = number(game.sequenceNumber);
      if (!game.id || !sequence) return [];
      const gameTeams = rows(game.teams).map(team).map(item => ({ ...item, name: teams.find(parent => parent.id === item.id)?.name ?? item.name }));
      return [{ id: String(game.id), number: sequence, started: game.started === true, finished: game.finished === true, seconds: number(row(game.clock).currentSeconds), teams: gameTeams }];
    }).sort((a, b) => a.number - b.number),
  };
}
