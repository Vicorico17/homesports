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
  const agents = await page('/agents'); assert.match(agents, /For agents|Agent access|AI agents/i);
  const login = await page('/login'); assert.match(login, /No account needed/); assert.doesNotMatch(login, /<form|type="email"/);
  const worlds = await page('/worlds'); assert.match(worlds, /Worlds 2026/); assert.match(worlds, /Show results/);
  assert.doesNotMatch(worlds, /<b>[12]<\/b>/, 'Spoiler-hidden Worlds cards exposed scores');
  const calendar = await fetch(`${base}/api/calendar/team/10`); assert.equal(calendar.status, 200); assert.match(await calendar.text(), /BEGIN:VCALENDAR/);
  console.log('PASS: 14 live routes and agent guide, separate live/results, confirmed winners only, public schedule links, no personal controls, login removed, Worlds spoilers hidden, preserved calendar feed and zoom metadata. Browser layout/interaction checks are separate.');
} finally {
  if (server && server.exitCode == null) { server.kill('SIGTERM'); await serverExit; }
  await rm(workspace, { recursive: true, force: true });
}
