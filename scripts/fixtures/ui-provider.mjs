// Synthetic local-only data for visual and interaction QA. Never load in production.
const originalFetch = globalThis.fetch;
const now = new Date();
const atHour = offset => new Date(now.getTime() + offset * 3_600_000).toISOString();
globalThis.fetch = async function fixtureFetch(input, init) {
  const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return originalFetch(input, init);
  if (!['api.pandascore.co', 'lol.fandom.com'].includes(url.hostname)) throw Error(`Unexpected external request in UI test: ${url.hostname}`);
  if (url.hostname === 'lol.fandom.com') return Response.json({ cargoquery: [] });
  const game = url.pathname.startsWith('/valorant') || /\/(?:teams|tournaments|series)\/1[123]\d(?:\/|$)/.test(url.pathname) || /\/matches\/11\d\d/.test(url.pathname) ? 'valorant' : 'lol';
  const offset = game === 'valorant' ? 100 : 0;
  const team = id => ({ id, name: id % 2 ? 'Team B with an exceptionally long team name' : 'Team A International Esports', videogame: { slug: game }, players: [] });
  const matches = ['running', 'not_started', 'finished'].map((status, index) => ({
    id: offset + 1000 + index, name: `Match ${index + 1}: Team A vs Team B`, status,
    begin_at: atHour(index === 0 ? -1 : index === 1 ? 3 : -24), number_of_games: 3, videogame: { slug: game },
    league: { name: game === 'lol' ? 'World Championship' : 'Valorant Champions' },
    tournament: { id: offset + 20, name: 'Knockout Stage', has_bracket: true },
    serie: { id: offset + 30, full_name: game === 'lol' ? 'World Championship 2026' : 'Valorant Champions 2026' },
    opponents: [{ opponent: team(offset + 10) }, { opponent: team(offset + 11) }],
    results: status === 'not_started' ? [] : [{ team_id: offset + 10, score: 2 }, { team_id: offset + 11, score: 1 }],
    streams_list: [{ raw_url: `https://www.twitch.tv/${status === 'running' ? 'riotgames' : status === 'not_started' ? 'upcomingfixture' : 'finishedfixture'}`, language: 'en', official: true }, { raw_url: 'https://www.youtube.com/watch?v=fixture1234', language: 'ro', official: false }],
  }));
  let body = [];
  if (/^\/(lol|valorant)\/matches\//.test(url.pathname)) {
    const status = url.pathname.endsWith('/running') ? 'running' : url.pathname.endsWith('/past') ? 'finished' : 'not_started';
    body = url.searchParams.get('page') === '1' ? matches.filter(match => match.status === status) : [];
    // A non-live record on the running endpoint must not become LIVE.
    if (status === 'running' && url.searchParams.get('page') === '1') body.push({ ...matches[1], id: offset + 1010, name: 'Not started despite running endpoint' });
  } else if (/^\/matches\/\d+$/.test(url.pathname)) body = matches.find(match => String(match.id) === url.pathname.split('/').pop()) ?? null;
  else if (/^\/teams\/\d+$/.test(url.pathname)) body = team(Number(url.pathname.split('/').pop()));
  else if (/^\/tournaments\/\d+$/.test(url.pathname)) body = { ...matches[0].tournament, videogame: { slug: game }, league: matches[0].league };
  else if (/^\/series\/\d+$/.test(url.pathname)) body = { ...matches[0].serie, videogame: { slug: game }, league: matches[0].league };
  else if (url.pathname.endsWith('/matches')) body = url.pathname.startsWith('/tournaments/') ? matches.map(match => ({ ...match, streams_list: [] })) : matches;
  else if (url.pathname.endsWith('/tournaments')) body = [matches[0].tournament];
  else if (url.pathname.endsWith('/brackets')) body = matches;
  else if (url.pathname.endsWith('/standings')) body = [{ rank: 1, team: team(offset + 10), wins: 1, losses: 0 }, { rank: 2, team: team(offset + 11), wins: 0, losses: 1 }];
  return Response.json(body, { headers: { date: new Date().toUTCString() } });
};
