import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdtemp, rm, symlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Render real routes against synthetic data. This is not a browser/layout test.
const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = await mkdtemp(path.join(tmpdir(), 'homesports-match-ui-'));
const env = { ...process.env, PANDASCORE_API_KEY: 'local-ui-fixture', ENABLE_ODDS: 'false', NEXT_PUBLIC_ENABLE_ACCOUNTS: 'false', NEXT_TELEMETRY_DISABLED: '1', NODE_OPTIONS: `--import ${path.join(root, 'scripts/fixtures/ui-provider.mjs')}` };
const next = path.join(root, 'node_modules/next/dist/bin/next');
let server, serverExit;
let output = '';
try {
  for (const name of ['src', 'package.json', 'tsconfig.json', 'next-env.d.ts']) await cp(path.join(root, name), path.join(workspace, name), { recursive: true });
  await symlink(path.join(root, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
  const build = spawn(process.execPath, [next, 'build', '--webpack'], { cwd: workspace, env, stdio: ['ignore', 'pipe', 'pipe'] });
  build.stdout.on('data', data => { output += data; }); build.stderr.on('data', data => { output += data; });
  assert.equal((await once(build, 'exit'))[0], 0, output);
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  server = spawn(process.execPath, [next, 'start', '--port', String(port), '--hostname', '127.0.0.1'], { cwd: workspace, env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverExit = once(server, 'exit');
  server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const response = await fetch(`${base}/robots.txt`); if (response.ok) break; } catch {}
    assert.ok(attempt < 99, `Server did not start: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  async function page(route) {
    const response = await fetch(base + route); assert.equal(response.status, 200, route);
    return (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  }
  const liveRoutes = ['/', '/valorant', '/competition/20', '/competition/series/30', '/valorant/competition/120', '/valorant/competition/series/130', '/worlds', '/calendar', '/valorant/calendar', '/match/1000?game=lol', '/match/1100?game=valorant', '/bracket/20', '/teams/10', '/valorant/teams/110'];
  for (const route of liveRoutes) {
    const html = await page(route);
    assert.match(html, /class="live-badge"/, `Missing LIVE badge: ${route}`);
    assert.doesNotMatch(html, /href="https:\/\/www\.twitch\.tv\/(upcomingfixture|finishedfixture)"/, `Non-live stream leaked on ${route}`);
    if (!route.includes('/bracket/')) {
      assert.match(html, /class="match-stream-primary"/, `Live primary stream missing: ${route}`);
      assert.match(html, /class="match-stream-alternatives"/, `Live alternate streams missing: ${route}`);
      assert.match(html, /href="https:\/\/www\.youtube\.com\/watch\?v=fixture1234"/, `Live alternate URL missing: ${route}`);
    }
    for (const card of html.match(/<article class="(?:match |competition-match |worlds-fixture |match-preview-card|valorant-history-row)[\s\S]*?<\/article>/g) ?? []) {
      assert.doesNotMatch(card, />Knockout Stage<|class="competition-link"/, `Stage label shown on match card: ${route}`);
    }
    assert.doesNotMatch(html, /class="follow-team-button|>Following<|Subscribe to calendar|Download \.ics/, `Personal controls on ${route}`);
    assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1(?:[",])/, `Zoom disabled on ${route}`);
    if (route.includes('/competition/')) {
      const live = html.match(/<article class="competition-match match-preview-card running"[\s\S]*?<\/article>/)?.[0];
      const result = html.match(/<article class="competition-match match-preview-card finished"[\s\S]*?<\/article>/)?.[0];
      assert.ok(live, `No live match row on ${route}`); assert.ok(result, `No completed result on ${route}`);
      assert.doesNotMatch(live, /competition-match-team winner/, `Premature winner on ${route}`);
      assert.match(result, /competition-match-team winner/, `Missing completed winner on ${route}`);
      assert.match(live, /href="\/match\/\d+\?game=(lol|valorant)"/);
      assert.match(live, /href="https:\/\/www\.twitch\.tv\/riotgames"/, `Verified feed stream lost on ${route}`);
    }
    if (route.endsWith('/calendar')) {
      assert.match(html, /Public match schedule/);
      assert.match(html, /href="\/match\/\d+\?game=(lol|valorant)"/);
    }
  }
  for (const [game, firstId] of [['lol', 1000], ['valorant', 1100]]) {
    const prefix = game === 'lol' ? '' : '/valorant';
    const home = await page(prefix || '/');
    assert.doesNotMatch(home, /<article class="[^"]*finished|>FINISHED<|>Finished<|Live coverage ended/, `Finished match shown on ${game} homepage`);
    assert.ok(!home.includes(`href="/match/${firstId + 2}?game=${game}"`), `Finished match linked from ${game} homepage`);
    assert.ok(!home.includes(`href="${prefix}/calendar"`), `Duplicate Schedule navigation on ${game} homepage`);
    assert.ok(home.includes(`href="${prefix}/results"`), `Results navigation lost for ${game}`);
    const results = await page(`${prefix}/results`);
    assert.match(results, /class="match match-preview-card finished"/, `Historical matches lost from ${game} Results`);
    assert.doesNotMatch(results, /match-stream-|Live coverage ended/, `Stream UI shown on ${game} Results`);
    for (const id of [firstId + 1, firstId + 2]) {
      const route = `/match/${id}?game=${game}`;
      const html = await page(route);
      assert.doesNotMatch(html, /match-stream-|href="https:\/\/(www\.)?(twitch\.tv|youtube\.com)\//, `Non-live preview has stream UI: ${route}`);
    }
    const feed = await (await fetch(`${base}/api/matches?game=${game}`)).json();
    assert.equal(feed.matches.find(match => match.id === firstId + 10)?.status, 'upcoming', `Non-live source promoted to LIVE: ${game}`);
    for (const id of [firstId, firstId + 1, firstId + 2]) {
      assert.equal(feed.matches.find(match => match.id === id)?.streams.length, 2, `Underlying primary/alternate stream data lost: ${game}/${id}`);
    }
  }
  for (const route of ['/worlds', '/play']) {
    const html = await page(route);
    assert.doesNotMatch(html, /href="\/calendar"/, `Duplicate Schedule navigation remains: ${route}`);
  }
  const agents = await page('/agents'); assert.match(agents, /For agents|Agent access|AI agents/i);
  const login = await page('/login'); assert.match(login, /No account needed/); assert.doesNotMatch(login, /<form|type="email"/);
  const worlds = await page('/worlds'); assert.match(worlds, /Worlds 2026/); assert.match(worlds, /Show results/);
  assert.doesNotMatch(worlds, /<b>[12]<\/b>/, 'Spoiler-hidden Worlds cards exposed scores');
  const calendar = await fetch(`${base}/api/calendar/team/10`); assert.equal(calendar.status, 200); assert.match(await calendar.text(), /BEGIN:VCALENDAR/);
  // Agent discovery is present in server-rendered HTML, with no JavaScript required.
  for (const route of ['/', '/live', '/results', '/calendar', '/valorant', '/valorant/live', '/valorant/results', '/valorant/calendar', '/privacy', '/agents', '/worlds', '/preselect-twitch-extension', '/bracket/20', '/match/1000?game=lol', '/match/1100?game=valorant']) {
    const response = await fetch(base + route); assert.equal(response.status, 200, route);
    const html = await response.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonical, `Canonical missing on ${route}`);
    assert.equal(new URL(canonical[1].replaceAll('&amp;', '&')).pathname + new URL(canonical[1].replaceAll('&amp;', '&')).search, route, `Wrong canonical on ${route}`);
    if (['/', '/live', '/results', '/calendar', '/privacy'].includes(route)) assert.match(html, /property="og:image" content="https:\/\/[^"]+\/homesports-logo.png"/, `Social image missing: ${route}`);
    assert.match(html, /rel="alternate" type="text\/plain" href="\/llms.txt"/, `Discovery link absent on ${route}`);
    assert.match(html, /rel="service-desc" type="application\/json" href="\/api\/agent\/openapi"/, `OpenAPI link absent on ${route}`);
    const structured = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(structured, `Structured metadata missing on ${route}`);
    assert.equal(JSON.parse(structured[1])['@type'], 'WebSite');
    if (route.startsWith('/match/')) assert.doesNotMatch(html, /name="robots" content="noindex/, `Valid match unexpectedly noindex: ${route}`);
  }
  const unavailableMatch = await page('/match/999999?game=lol');
  assert.match(unavailableMatch, /name="robots" content="noindex/, 'Unavailable match must not be indexed');
  for (const [route, type] of [['/llms.txt', 'text/plain'], ['/llms-full.txt', 'text/plain'], ['/agents/index.md', 'text/markdown'], ['/api/agent/site', 'application/json'], ['/api/agent/openapi', 'application/json']]) {
    const response = await fetch(base + route); assert.equal(response.status, 200, route);
    assert.ok(response.headers.get('content-type').startsWith(type), route);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', route);
  }
  const guide = await (await fetch(base + '/llms-full.txt')).text();
  assert.equal(guide, await (await fetch(base + '/agents/index.md')).text());
  const catalog = await (await fetch(base + '/api/agent/site')).json();
  assert.equal(catalog.pages.length, 13); assert.equal(catalog.routeFamilies.length, 9);
  assert.equal(catalog.access.readOnly, true); assert.equal(catalog.access.mcpAvailable, false);
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  for (const suffix of ['/match/1000?game=lol', '/match/1100?game=valorant', '/bracket/20', '/valorant/bracket/120']) assert.ok(sitemap.includes(suffix), `Missing sitemap URL ${suffix}`);
  assert.ok(!sitemap.includes('/login'));
  const robots = await (await fetch(base + '/robots.txt')).text();
  assert.match(robots, /Allow: \/api\/agent\//); assert.match(robots, /Disallow: \/api\//);
  const spec = await (await fetch(base + '/api/agent/openapi')).json();
  // Validate the actual JSON against the schema vocabulary used by this contract.
  function validate(schema, value, at = '$') {
    if (schema.const !== undefined) assert.equal(value, schema.const, at);
    if (schema.enum) assert.ok(schema.enum.includes(value), at);
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value === 'number' && Number.isInteger(value) ? 'integer' : typeof value;
    assert.ok(types.includes(type) || (type === 'integer' && types.includes('number')), `${at}: ${type} not ${types}`);
    if (type === 'object') {
      for (const key of schema.required ?? []) assert.ok(key in value, `${at}.${key} required`);
      for (const [key, field] of Object.entries(value)) {
        if (schema.additionalProperties === false) assert.ok(key in schema.properties, `${at}.${key} unexpected`);
        if (schema.properties[key]) validate(schema.properties[key], field, `${at}.${key}`);
      }
    }
    if (type === 'array') value.forEach((item, index) => validate(schema.items, item, `${at}[${index}]`));
    if (schema.format === 'uri' && value !== null) assert.ok(new URL(value));
    if (schema.format === 'date-time' && value !== null) assert.ok(Number.isFinite(Date.parse(value)), at);
  }
  validate(spec.paths['/api/agent/site'].get.responses['200'].content['application/json'].schema, catalog);
  for (const game of ['lol', 'valorant']) {
    const feed = await (await fetch(`${base}/api/agent/matches?game=${game}&limit=50`)).json();
    validate(spec.paths['/api/agent/matches'].get.responses['200'].content['application/json'].schema, feed);
    assert.equal(feed.schemaVersion, '1.1'); assert.equal(feed.resultsIncluded, false);
    assert.equal(feed.source.demo, false); assert.ok(feed.source.freshUntil);
    for (const match of feed.matches) {
      assert.ok(match.opponents.every(team => !('score' in team)));
      if (match.status !== 'running') assert.deepEqual(match.streams, []);
      if ([1010, 1110].includes(match.id)) {
        assert.equal(match.tournament.id, null); assert.equal(match.tournament.url, null); assert.equal(match.tournament.bracketUrl, null);
        assert.ok(!sitemap.includes(`/competition/${match.id}</loc>`), 'Fallback match id leaked as tournament id');
        assert.ok(!sitemap.includes(`/bracket/${match.id}</loc>`), 'Fallback match id leaked as bracket id');
      } else assert.ok(match.tournament.url);
      assert.ok(match.series.url);
    }
    const scores = await (await fetch(`${base}/api/agent/matches?game=${game}&include_results=true&status=finished`)).json();
    validate(spec.paths['/api/agent/matches'].get.responses['200'].content['application/json'].schema, scores);
    assert.ok(scores.matches.some(match => match.opponents.some(team => 'score' in team)));
  }
  assert.equal((await fetch(base + '/api/agent/matches?game=bad')).status, 400);
  console.log('PASS: site-wide agent catalog, guide/content types, OpenAPI response schemas, page canonicals, JSON-LD, sitemap, noindex unavailable matches, spoiler safety and per-page freshness.');
  console.log('PASS: 14 live routes, 4 non-live previews and both feeds; live-only primary/alternate controls with preserved data, agent guide, separate live/results, confirmed winners only, public schedule links, no personal controls, login removed, Worlds spoilers hidden, preserved calendar feed and zoom metadata. Browser layout/interaction checks are separate.');
} finally {
  if (server && server.exitCode == null) { server.kill('SIGTERM'); await serverExit; }
  await rm(workspace, { recursive: true, force: true });
}
