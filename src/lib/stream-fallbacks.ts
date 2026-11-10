import { unstable_cache } from 'next/cache';
import type { Match } from './matches';
import type { Game } from './game';
import { loadVlrStreams, type StreamTarget } from './vlr-stream-source';
import { loadLolStreams } from './lol-stream-source';
import { createStreamPageReader } from './stream-page-reader';
import { singleFlight } from './match-feed-loader';

const load = singleFlight(async (key: string) => {
  const { game, targets } = JSON.parse(key) as { game: Game; targets: StreamTarget[] };
  const read = createStreamPageReader();
  try { return await (game === 'valorant' ? loadVlrStreams(targets, read) : loadLolStreams(targets, read)); }
  catch { return {}; }
});
const cachedFallbacks = unstable_cache(load, ['match-stream-fallbacks-v1'], { revalidate: 300 });

/** PandaScore wins. Secondary lookups never replace a valid primary link or break a schedule. */
export async function enrichMatchStreams(matches: Match[], game: Game): Promise<Match[]> {
  const targets: StreamTarget[] = matches.filter(match => !match.streams.length && ['running', 'upcoming'].includes(match.status) && match.opponents.length === 2)
    .sort((a, b) => Number(b.status === 'running') - Number(a.status === 'running') || Date.parse(a.beginAt) - Date.parse(b.beginAt))
    .slice(0, 12).map(({ id, status, beginAt, scheduledAt, league, serie, opponents }) => ({ id, status, beginAt, scheduledAt, league, serie, opponents: opponents.map(({ name }) => ({ name })) }));
  if (!targets.length) return matches;
  try {
    const found = await cachedFallbacks(JSON.stringify({ game, targets }));
    return matches.map(match => match.streams.length || !found[match.id]?.length ? match : { ...match, streams: found[match.id] });
  } catch { return matches; }
}
