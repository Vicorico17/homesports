import type { MatchStatus } from './matches.ts';

/** The endpoint is not proof of live play: only an explicit source status is. */
export function normalizeMatchStatus(sourceStatus: unknown, requestedStatus: MatchStatus): MatchStatus {
  if (sourceStatus === 'running' || sourceStatus === 'finished') return sourceStatus;
  if (sourceStatus === 'not_started' || requestedStatus === 'running') return 'upcoming';
  return requestedStatus;
}
