import type { Game } from './game';
import type { RosterPlayer } from './roster';

export type RosterTeam = {
  id: number; name?: string; image_url?: string | null;
  current_videogame?: { slug?: string } | null; videogame?: { slug?: string } | null;
  players?: unknown[];
};
export type RosterSnapshot = {
  players: RosterPlayer[];
  scope: 'current' | 'tournament';
  status: 'available' | 'unavailable' | 'under-review';
  sourceDate: string | null;
  omitted: number;
};
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function positiveId(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0; }
function text(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function matchesGame(slug: unknown, game: Game) { return game === 'lol' ? slug === 'lol' || slug === 'league-of-legends' : slug === 'valorant'; }

/** PandaScore teams use current_videogame, unlike match.videogame. Fail closed on unknown/conflicting identity. */
export function isRosterTeam(value: unknown, teamId: number, game: Game): value is RosterTeam {
  if (!record(value) || !positiveId(teamId) || value.id !== teamId) return false;
  const games = [value.current_videogame, value.videogame].filter(record);
  return games.length > 0 && games.every(item => matchesGame(item.slug, game));
}

export function emptyRoster(scope: RosterSnapshot['scope'], sourceDate?: string | null): RosterSnapshot {
  return { players: [], scope, status: 'unavailable', sourceDate: sourceDate && Number.isFinite(Date.parse(sourceDate)) ? new Date(sourceDate).toISOString() : null, omitted: 0 };
}

function playersForTeam(raw: unknown[], teamId: number, game: Game, scope: RosterSnapshot['scope']) {
  const seen = new Set<number>();
  return raw.flatMap(value => {
    if (!record(value) || !positiveId(value.id) || seen.has(value.id)) return [];
    const name = text(value.nickname) ?? text(value.name);
    if (!name) return [];
    // Current membership/activity must not rewrite a past tournament's participants.
    if (scope === 'current') {
      if (value.active === false || value.current_team === null) return [];
      if (record(value.current_team) && value.current_team.id !== teamId) return [];
      if (record(value.current_videogame) && !matchesGame(value.current_videogame.slug, game)) return [];
    }
    const role = text(value.role) ?? text(value.position) ?? text(value.lane) ?? text(value.role_name);
    if (role && /coach|manager|analyst|streamer|content creator/i.test(role)) return [];
    seen.add(value.id);
    const image = text(value.image_url);
    // Keep identity and portrait on the same provider record. Never join on a display name.
    const player: RosterPlayer = { id: value.id, name, ...(image && /^https:\/\//i.test(image) ? { image_url: image } : {}), ...(role ? { role } : {}) };
    if (value.substitute === true || value.is_substitute === true) player.substitute = true;
    return [player];
  });
}

export function currentRoster(profile: unknown, teamId: number, game: Game, sourceDate?: string | null): RosterSnapshot {
  const result = emptyRoster('current', sourceDate);
  if (!isRosterTeam(profile, teamId, game) || !Array.isArray(profile.players)) return result;
  // Audit 2026-11-10: provider's G2 VALORANT list mixes shhhack (staff) and shanks
  // (creator) with competitors. Quarantine until a fresh source-backed review.
  // https://g2esports.com/pages/team/valorant
  // https://www.vlr.gg/team/11058/g2-esports/
  if (game === 'valorant' && teamId === 128538) return { ...result, status: 'under-review' };
  const players = playersForTeam(profile.players, teamId, game, 'current');
  return { ...result, players, status: players.length ? 'available' : 'unavailable', omitted: profile.players.length - players.length };
}

/** Contract: GET /tournaments/{id}/rosters => { type: "Team", rosters: Team[] }. */
export function tournamentRoster(payload: unknown, teamId: number, game: Game, sourceDate?: string | null): RosterSnapshot {
  const result = emptyRoster('tournament', sourceDate);
  if (!record(payload) || payload.type !== 'Team' || !Array.isArray(payload.rosters)) return result;
  const teams = payload.rosters;
  const matches = teams.filter(value => record(value) && value.id === teamId);
  if (matches.length !== 1 || !isRosterTeam(matches[0], teamId, game) || !Array.isArray(matches[0].players)) return result;
  const roster = matches[0];
  const players = playersForTeam(roster.players!, teamId, game, 'tournament').filter(player => {
    // Ambiguous membership must not quietly put the same person on both opponents.
    return !teams.some(other => record(other) && other.id !== teamId && Array.isArray(other.players) && other.players.some(candidate => record(candidate) && candidate.id === player.id));
  });
  return { ...result, players, status: players.length ? 'available' : 'unavailable', omitted: roster.players!.length - players.length };
}
