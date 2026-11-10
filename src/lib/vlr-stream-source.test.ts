import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingVlrStreams, vlrEventCandidates, vlrMatchCandidates, loadVlrStreams, type StreamTarget } from './vlr-stream-source.ts';
const target: StreamTarget = { id: 1, status: 'running', beginAt: '2026-11-10T12:15:00Z', scheduledAt: '2026-11-10T12:00:00Z', league: 'Asia Pacific Predator League', serie: 'Thailand 2027', opponents: [{name:'Team A'}, {name:'Team B'}] };
const source = 'https://www.vlr.gg/123/team-a-vs-team-b';
const fixture = `<div class="wf-card  match-header"><span class="match-header-vs-note mod-live">live</span><a class="match-header-event"><div>Predator League 2027: Thailand</div></a><div data-utc-ts="2026-11-10 12:00:00"></div><a class="match-header-link"><div class="wf-title-med mod-single">Team A</div></a><a class="match-header-link"><div class="wf-title-med mod-single">Team B</div></a></div><div class="sm-pane sm-pane-streams"><div class="sm-btn mod-embed" data-type="broadcast" data-site="twitch"><a class="sm-ext" href="https://www.twitch.tv/matchchannel">Watch</a></div><div class="sm-btn mod-offline" data-type="broadcast"><a class="sm-ext" href="https://www.twitch.tv/offline">Offline</a></div></div><div class="sm-pane sm-pane-vods"><a class="sm-ext" href="https://www.youtube.com/watch?v=abcdefghijk">VOD</a></div>`;
const index = '<a class="match-item" href="/123/team-a-vs-team-b"><div class="match-item-vs-team-name">Team A</div><div class="match-item-vs-team-name">Team B</div></a>';

test('accepts stream only from the verified match Streams section, never VOD/offline links', () => {
  const streams = matchingVlrStreams(target, fixture, source);
  assert.equal(streams.length, 1); assert.equal(streams[0].url, 'https://www.twitch.tv/matchchannel'); assert.equal(streams[0].sourceUrl, source);
  assert.equal(matchingVlrStreams({...target, opponents: [...target.opponents].reverse()}, fixture, source).length, 1);
});
test('rejects mismatched opponents, date, competition, status and unsafe source URLs', () => {
  assert.deepEqual(matchingVlrStreams({...target, opponents:[{name:'Team A'}, {name:'Team C'}]}, fixture, source), []);
  assert.deepEqual(matchingVlrStreams({...target, scheduledAt:'2026-11-11T12:00:00Z'}, fixture, source), []);
  assert.deepEqual(matchingVlrStreams({...target, serie:'Indonesia 2027'}, fixture, source), []);
  assert.deepEqual(matchingVlrStreams({...target, status:'finished'}, fixture, source), []);
  assert.deepEqual(matchingVlrStreams(target, fixture, 'https://attacker.test/123/team-a-vs-team-b'), []);
  assert.deepEqual(matchingVlrStreams(target, fixture.replace('Team B</div>', 'TBD</div>'), source), []);
  assert.deepEqual(matchingVlrStreams(target, fixture.replace('sm-pane sm-pane-streams', 'unknown-markup'), source), []);
});
test('discovery is bounded and does not treat generic event channels as match streams', async () => {
  assert.deepEqual(vlrMatchCandidates(index, target), [source]);
  const events = '<a class="event-item" href="/event/3228/predator"><div class="event-item-title">Predator League 2027: Thailand</div></a>';
  assert.deepEqual(vlrEventCandidates(events, [target]), ['https://www.vlr.gg/event/3228/predator']);
  const reads: string[] = [];
  const result = await loadVlrStreams([target], async url => { reads.push(url); return url.endsWith('/matches/') ? index : url === source ? fixture : ''; });
  assert.equal(result[1]?.length, 1); assert.equal(reads.length, 3);
});
test('empty streams and unavailable pages preserve absence, never a guessed tournament URL', async () => {
  const result = await loadVlrStreams([target], async url => url.endsWith('/matches/') ? index : 'No stream available');
  assert.deepEqual(result, {});
});

test('duplicate fixture identities remain ambiguous even when one has no stream', async () => {
  const second = index.replaceAll('/123/team-a-vs-team-b', '/124/team-a-vs-team-b');
  const empty = fixture.replace('https://www.twitch.tv/matchchannel', 'https://example.com/not-a-stream');
  assert.deepEqual(await loadVlrStreams([target], async url => url.endsWith('/matches/') ? index + second : url.includes('/123/') ? empty : url.includes('/124/') ? fixture : ''), {});
  assert.deepEqual(await loadVlrStreams([target], async url => url.endsWith('/matches/') ? index + second : url.includes('/123/') ? fixture : null), {});
  assert.deepEqual(matchingVlrStreams(target, fixture.replace('12:00:00', '12:30:00'), source), []);
});
