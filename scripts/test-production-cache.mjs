import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdtemp, readFile, readdir, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = await mkdtemp(path.join(tmpdir(), 'homesports-cache-'));
const log = path.join(workspace, 'provider.log');
const modeFile = path.join(workspace, 'provider-mode');
const environment = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1', PANDASCORE_API_KEY: 'local-test-fixture', ENABLE_ODDS: 'false',
  NEXT_PUBLIC_ENABLE_ACCOUNTS: 'false', CACHE_TEST_LOG: log, CACHE_TEST_MODE_FILE: modeFile,
  NODE_OPTIONS: `--import ${path.join(root, 'scripts/fixtures/cache-provider.mjs')}`,
};
let server;
let serverExit;
let output = '';
async function command(args) {
  const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), ...args], { cwd: workspace, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  let text = '';
  child.stdout.on('data', data => { text += data; });
  child.stderr.on('data', data => { text += data; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 0, text);
  return text;
}
const calls = async () => (await readFile(log, 'utf8')).trim().split('\n').filter(Boolean);
const feedCalls = list => list.filter(url => /\/(lol|valorant)\/matches\//.test(url));
try {
  for (const name of ['src', 'package.json', 'tsconfig.json', 'next-env.d.ts']) await cp(path.join(root, name), path.join(workspace, name), { recursive: true });
  await symlink(path.join(root, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
  await writeFile(log, '');
  await writeFile(modeFile, 'healthy');
  // Isolated build: no production credentials, network calls or .next output.
  const build = await command(['build', '--webpack']);
  for (const route of ['/teams/[id]', '/competition/[id]', '/competition/series/[id]', '/bracket/[id]', '/valorant/teams/[id]', '/valorant/competition/[id]', '/valorant/competition/series/[id]', '/valorant/bracket/[id]']) {
    assert.ok(build.split('\n').some(line => line.includes(`● ${route}`)), `Not statically cached: ${route}\n${build}`);
  }
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  async function startServer() {
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--port', String(port), '--hostname', '127.0.0.1'], { cwd: workspace, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
    serverExit = once(server, 'exit');
    server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
    for (let attempt = 0; attempt < 100; attempt++) {
      try { const response = await fetch(`${base}/robots.txt`); if (response.ok) return; } catch {}
      assert.ok(attempt < 99, `Server did not start: ${output}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  async function stopServer() { server.kill('SIGTERM'); await serverExit; }
  await startServer();
  const lol = await (await fetch(`${base}/api/matches?game=lol`)).json();
  const before = feedCalls(await calls()).length;
  const repeat = await (await fetch(`${base}/api/matches?game=lol`)).json();
  assert.equal(lol.demo, false); assert.deepEqual(lol, repeat);
  assert.equal(feedCalls(await calls()).length, before, 'Repeated API request refetched/normalized feed');
  const agentResponse = await fetch(`${base}/api/agent/matches?game=lol&limit=1`);
  const agent = await agentResponse.json();
  assert.equal(agentResponse.status, 200);
  assert.equal(agent.schemaVersion, '1.0');
  assert.equal(agent.source.demo, false);
  assert.equal(agent.source.updatedAt, lol.updatedAt);
  assert.equal(agent.resultsIncluded, false);
  assert.equal(agent.matches[0].id, lol.matches[0].id);
  assert.equal('score' in agent.matches[0].opponents[0], false);
  assert.equal(feedCalls(await calls()).length, before, 'Agent API refetched shared feed');
  assert.equal((await fetch(`${base}/api/agent/matches?limit=51`)).status, 400);
  assert.equal((await fetch(`${base}/api/agent/matches?game=bad`)).status, 400);
  assert.equal(feedCalls(await calls()).length, before, 'Invalid agent request reached provider');
  const spec = await (await fetch(`${base}/api/agent/openapi`)).json();
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(spec.paths['/api/agent/matches'].get.operationId, 'listMatches');
  const discovery = await fetch(`${base}/llms.txt`);
  assert.match(discovery.headers.get('content-type'), /text\/plain/);
  assert.match(await discovery.text(), /agents\/index.md/);
  const guide = await fetch(`${base}/agents/index.md`);
  assert.match(guide.headers.get('content-type'), /text\/markdown/);
  assert.match(await guide.text(), /not yet available at \/mcp/);
  const agentPage = await fetch(`${base}/agents`);
  assert.equal(agentPage.status, 200);
  assert.match(await agentPage.text(), /A clear view of the matchboard/);
  assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Allow: \/api\/agent\//);
  const valorant = await (await fetch(`${base}/api/matches?game=valorant`)).json();
  assert.equal(valorant.game, 'valorant'); assert.notEqual(valorant.matches[0].id, lol.matches[0].id);
  const beforeWorlds = feedCalls(await calls()).length;
  const worlds = await (await fetch(`${base}/api/worlds`)).json();
  assert.ok(worlds.matches.length > 0); assert.equal(feedCalls(await calls()).length, beforeWorlds, 'Worlds refetched shared match feed');
  const calendar = await fetch(`${base}/api/calendar/team/10`);
  assert.equal(calendar.status, 200); assert.ok(calendar.headers.get('cache-control').includes('s-maxage=300'));
  assert.ok((await calendar.text()).includes('BEGIN:VEVENT'));
  for (const route of ['/teams/10', '/competition/20', '/competition/series/30', '/bracket/20', '/valorant/teams/110', '/valorant/competition/120', '/valorant/competition/series/130', '/valorant/bracket/120']) {
    const first = await fetch(base + route); const body = await first.text(); assert.equal(first.status, 200, route);
    const hit = await fetch(base + route); assert.equal(hit.status, 200, route);
    assert.equal(hit.headers.get('x-nextjs-cache'), 'HIT', `No ISR hit for ${route}`);
    assert.match(hit.headers.get('cache-control'), /s-maxage=60(?:,|$)/, `Unexpected freshness for ${route}`); assert.equal(await hit.text(), body, route);
  }
  // Match squads must come from the tournament response, never the current team profile.
  for (const [route, teamId] of [['/match/1000?game=lol', 10], ['/match/1100?game=valorant', 110]]) {
    const response = await fetch(base + route); const body = await response.text();
    assert.equal(response.status, 200, route);
    assert.ok(body.includes(`Tournament member ${teamId}`), `Missing tournament squad: ${route}`);
    assert.ok(!body.includes(`Current member ${teamId}`), `Current membership leaked into tournament: ${route}`);
  }
  for (const route of ['/teams/110', '/valorant/teams/10']) {
    const response = await fetch(base + route); const body = await response.text();
    // Next can stream the notFound boundary after a 200 header; verify its noindex boundary too.
    assert.ok(response.status === 404 || body.includes('NEXT_HTTP_ERROR_FALLBACK;404'), `Cross-game team accepted: ${route}`);
    assert.ok(!body.includes('roster-player'), `Wrong-game roster rendered: ${route}`);
  }
  const beforeInvalid = (await calls()).length;
  for (const route of ['/competition/invalid', '/competition/series/invalid', '/bracket/invalid']) {
    const response = await fetch(base + route); await response.text(); assert.equal(response.status, 404, route);
  }
  assert.equal((await calls()).length, beforeInvalid, 'Invalid IDs called the provider');
  // Simulate an expired Data Cache snapshot and a provider outage without waiting
  // minutes or touching real services. Restart also clears process-local memory.
  await stopServer();
  const cacheDirectory = path.join(workspace, '.next/cache/fetch-cache');
  const staleDate = new Date(Date.now() - 240_000);
  let aged = 0;
  for (const filename of await readdir(cacheDirectory)) {
    const file = path.join(cacheDirectory, filename);
    const entry = JSON.parse(await readFile(file, 'utf8'));
    let feed;
    try { feed = JSON.parse(entry.data?.body); } catch { continue; }
    if (feed.game !== 'lol' || feed.demo || !Array.isArray(feed.matches)) continue;
    entry.data.body = JSON.stringify({ ...feed, updatedAt: staleDate.toISOString() });
    await writeFile(file, JSON.stringify(entry)); await utimes(file, staleDate, staleDate); aged++;
  }
  assert.ok(aged > 0, 'No shared feed cache entry found');
  await writeFile(modeFile, 'rate-limited'); await startServer();
  const retained = await (await fetch(`${base}/api/matches?game=lol`)).json();
  assert.equal(retained.demo, false); assert.deepEqual(retained.matches, lol.matches);
  assert.equal(retained.sourceStatus, 'unavailable');
  const unavailableCalendar = await fetch(`${base}/api/calendar/team/10`);
  assert.equal(unavailableCalendar.status, 503, 'An outage must not erase subscribed events with an empty calendar');
  await unavailableCalendar.text();
  await stopServer(); await writeFile(modeFile, 'healthy'); await startServer();
  let recovered;
  for (let attempt = 0; attempt < 20; attempt++) {
    recovered = await (await fetch(`${base}/api/matches?game=lol`)).json();
    if (recovered.sourceStatus === 'healthy') break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(recovered.sourceStatus, 'healthy', output);
  assert.deepEqual(recovered.matches, lol.matches);
  assert.notEqual(recovered.updatedAt, staleDate.toISOString());
  await stopServer();
  for (const filename of await readdir(cacheDirectory)) {
    const file = path.join(cacheDirectory, filename);
    const entry = JSON.parse(await readFile(file, 'utf8'));
    let feed;
    try { feed = JSON.parse(entry.data?.body); } catch { continue; }
    if (feed.game === 'lol' && Array.isArray(feed.matches)) await rm(file);
  }
  await writeFile(modeFile, 'rate-limited'); await startServer();
  const coldResponse = await fetch(`${base}/api/matches?game=lol`);
  assert.equal(coldResponse.status, 200, 'Cold provider outage must not crash the API');
  const cold = await coldResponse.json();
  assert.equal(cold.sourceStatus, 'unavailable'); assert.equal(cold.demo, false);
  assert.deepEqual(cold.matches, [], 'No fabricated matches during an outage');
  console.log('PASS: eight ISR hits, shared feeds, game separation, Worlds reuse, calendar caching, invalid IDs, expired-cache/429 retention, recovery and cold-outage handling. No external provider requests.');
} finally {
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await serverExit; }
  await rm(workspace, { recursive: true, force: true });
}
