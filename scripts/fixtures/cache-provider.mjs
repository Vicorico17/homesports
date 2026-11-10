// Used only by test-production-cache.mjs, never by the application runtime.
import { appendFileSync, readFileSync } from 'node:fs';
const originalFetch = globalThis.fetch;
globalThis.fetch = async function fixtureFetch(input, init) {
  const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return originalFetch(input, init);
  if (!['api.pandascore.co', 'lol.fandom.com'].includes(url.hostname)) throw Error(`Unexpected external request in cache test: ${url.hostname}`);
  appendFileSync(process.env.CACHE_TEST_LOG, `${url.href}\n`);
  const mode = process.env.CACHE_TEST_MODE_FILE ? readFileSync(process.env.CACHE_TEST_MODE_FILE, 'utf8') : 'healthy';
  if (mode === 'rate-limited' && url.hostname === 'api.pandascore.co') {
    return new Response(null, { status: 429, headers: { 'retry-after': '60' } });
  }

  const game = url.pathname.startsWith('/valorant') || /\/(?:teams|tournaments|series)\/1[123]0(?:\/|$)/.test(url.pathname) || url.pathname === '/matches/1100' ? 'valorant' : 'lol';
  const offset = game === 'valorant' ? 100 : 0;
  const team = id => ({ id, name: `Fixture ${id}`, current_videogame: { slug: game === 'lol' ? 'league-of-legends' : game }, players: [{ id: id * 10, name: `Current member ${id}`, active: true }] });
  const match = {
    id: offset + 1000, name: 'Fixture A vs Fixture B', status: 'not_started',
    begin_at: '2026-11-15T12:00:00Z', number_of_games: 3, videogame: { slug: game },
    league: { name: game === 'lol' ? 'World Championship' : 'Valorant Champions' },
    tournament: { id: offset + 20, name: 'Group Stage', has_bracket: false },
    serie: { id: offset + 30, full_name: game === 'lol' ? 'World Championship 2026' : 'Valorant Champions 2026' },
    opponents: [{ opponent: team(offset + 10) }, { opponent: team(offset + 11) }], results: [],
  };
  let body = [];
  if (url.hostname === 'lol.fandom.com') body = { cargoquery: [] };
  else if (/^\/(lol|valorant)\/matches\//.test(url.pathname)) body = url.pathname.endsWith('/upcoming') && url.searchParams.get('page') === '1' ? [match] : [];
  else if (url.pathname === `/matches/${offset + 1000}`) body = match;
  else if (url.pathname === `/tournaments/${offset + 20}/rosters`) body = { type: 'Team', rosters: [offset + 10, offset + 11].map(id => ({ ...team(id), players: [{ id: id * 100, name: `Tournament member ${id}`, active: false }] })) };
  else if (/^\/teams\/\d+$/.test(url.pathname)) body = team(Number(url.pathname.split('/').pop()));
  else if (/^\/tournaments\/\d+$/.test(url.pathname)) body = { ...match.tournament, videogame: { slug: game }, league: match.league };
  else if (/^\/series\/\d+$/.test(url.pathname)) body = { ...match.serie, videogame: { slug: game }, league: match.league };
  else if (url.pathname.endsWith('/matches')) body = [match];
  else if (url.pathname.endsWith('/tournaments')) body = [match.tournament];
  return Response.json(body, { headers: { date: new Date().toUTCString() } });
};
