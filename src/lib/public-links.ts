import type { Match } from "./matches.ts";

export function publicTournamentId(match: Match): number | null {
  const id = match.tournamentId;
  if (!Number.isSafeInteger(id) || id <= 0 || match.tournamentIdVerified === false) return null;
  // Legacy feed snapshots used the match id when no tournament id was supplied.
  // Treat that ambiguous equality as unknown until a fresh normalization confirms it.
  if (match.tournamentIdVerified !== true && id === match.id) return null;
  return id;
}
