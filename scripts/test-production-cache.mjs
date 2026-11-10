import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = await mkdtemp(path.join(tmpdir(), 'homesports-cache-'));
const log = path.join(workspace, 'provider.log');
const environment = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1', PANDASCORE_API_KEY: 'local-test-fixture', ENABLE_ODDS: 'false',
  NEXT_PUBLIC_ENABLE_ACCOUNTS: 'false', CACHE_TEST_LOG: log,
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
  // Isolated build: no production credentials, network calls or .next output.
  const build = await command(['build', '--webpack']);
  for (const route of ['/teams/[id]', '/competition/[id]', '/competition/series/[id]', '/bracket/[id]', '/valorant/teams/[id]', '/valorant/competition/[id]', '/valorant/competition/series/[id]', '/valorant/bracket/[id]']) {
    assert.ok(build.split('\n').some(line => line.includes(`● ${route}`)), `Not statically cached: ${route}\n${build}`);
  }
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--port', String(port), '--hostname', '127.0.0.1'], { cwd: workspace, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  serverExit = once(server, 'exit');
  server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const response = await fetch(`${base}/robots.txt`); if (response.ok) break; } catch {}
    assert.ok(attempt < 99, `Server did not start: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const lol = await (await fetch(`${base}/api/matches?game=lol`)).json();
  const before = feedCalls(await calls()).length;
  const repeat = await (await fetch(`${base}/api/matches?game=lol`)).json();
  assert.equal(lol.demo, false); assert.deepEqual(lol, repeat);
  assert.equal(feedCalls(await calls()).length, before, 'Repeated API request refetched/normalized feed');
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
  const beforeInvalid = (await calls()).length;
  for (const route of ['/competition/invalid', '/competition/series/invalid', '/bracket/invalid']) {
    const response = await fetch(base + route); await response.text(); assert.equal(response.status, 404, route);
  }
  assert.equal((await calls()).length, beforeInvalid, 'Invalid IDs called the provider');
  console.log('PASS: eight ISR route hits, shared normalized feeds, game separation, Worlds reuse, calendar CDN headers, invalid-ID guards. No external provider requests.');
} finally {
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await serverExit; }
  await rm(workspace, { recursive: true, force: true });
}
