// Used only by test-production-cache.mjs, never by the application runtime.
import { appendFileSync } from 'node:fs';
const originalFetch = globalThis.fetch;
globalThis.fetch = async function fixtureFetch(input, init) {
  const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return originalFetch(input, init);
  if (!['api.pandascore.co', 'lol.fandom.com'].includes(url.hostname)) throw Error(`Unexpected external request in cache test: ${url.hostname}`);
  appendFileSync(process.env.CACHE_TEST_LOG, `${url.href}\n`);
  const game = url.pathname.startsWith('/valorant') || /\/(?:teams|tournaments|series)\/1[123]0(?:\/|$)/.test(url.pathname) ? 'valorant' : 'lol';
  const offset = game === 'valorant' ? 100 : 0;
  const team = id => ({ id, name: `Fixture ${id}`, videogame: { slug: game }, players: [] });
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
  else if (/^\/teams\/\d+$/.test(url.pathname)) body = team(Number(url.pathname.split('/').pop()));
  else if (/^\/tournaments\/\d+$/.test(url.pathname)) body = { ...match.tournament, videogame: { slug: game }, league: match.league };
  else if (/^\/series\/\d+$/.test(url.pathname)) body = { ...match.serie, videogame: { slug: game }, league: match.league };
  else if (url.pathname.endsWith('/matches')) body = [match];
  else if (url.pathname.endsWith('/tournaments')) body = [match.tournament];
  return Response.json(body, { headers: { date: new Date().toUTCString() } });
};
