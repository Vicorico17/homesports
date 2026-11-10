import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLolStreams, findLolMatchStreams, parseLolSchedule } from './lol-stream-source.ts';
const raw = { __typename: 'EventMatch', id: '123', startTime: '2026-11-11T09:00:00Z', state: 'inProgress', matchTeams: [{ name: 'Ground Zero Gaming' }, { name: 'Frank Esports' }], streams: [{ provider: 'twitch', parameter: 'lcp', mediaLocale: { locale: 'en-US' } }, { provider: 'youtube', parameter: 'abcdefghijk', mediaLocale: { locale: 'en-US' } }] };
const html = (events: unknown[]) => `<script>(window[Symbol.for("ApolloSSRDataTransport")] ??= []).push(${JSON.stringify({ data: { events } })});</script>`;
const match = { status: 'running', beginAt: raw.startTime, opponents: raw.matchTeams, streams: [] };

test('extracts only exact official event streams, not unrelated script text', () => {
  const events = parseLolSchedule(html([raw]));
  assert.equal(findLolMatchStreams(match, events)[0].url, 'https://www.twitch.tv/lcp');
  assert.equal(findLolMatchStreams(match, events)[1].url, 'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(findLolMatchStreams({ ...match, opponents: [...match.opponents].reverse() }, events).length, 2);
  assert.deepEqual(parseLolSchedule(`<script>${JSON.stringify(raw)}</script>`), []);
});
test('rejects fuzzy teams, changed times, unknown teams, completed and ambiguous events', () => {
  const events = parseLolSchedule(html([raw]));
  assert.deepEqual(findLolMatchStreams({ ...match, opponents: [{ name: 'GZ' }, { name: 'Frank Esports' }] }, events), []);
  assert.deepEqual(findLolMatchStreams({ ...match, beginAt: '2026-11-11T10:00:00Z' }, events), []);
  assert.deepEqual(findLolMatchStreams({ ...match, status: 'finished' }, events), []);
  assert.deepEqual(parseLolSchedule(html([{ ...raw, matchTeams: [{ name: 'TBD' }, { name: 'Frank Esports' }] }])), []);
  assert.deepEqual(parseLolSchedule(html([{ ...raw, state: 'completed' }])), []);
  assert.deepEqual(findLolMatchStreams(match, parseLolSchedule(html([raw, { ...raw, id: '124' }]))), []);
  assert.deepEqual(parseLolSchedule(html([raw, { ...raw, streams: [] }])), []);
});
test('fails closed without event streams and rejects invalid provider values', () => {
  assert.deepEqual(findLolMatchStreams(match, parseLolSchedule(html([{ ...raw, streams: [] }]))), []);
  assert.deepEqual(findLolMatchStreams(match, parseLolSchedule(html([{ ...raw, streams: [{ provider: 'twitch', parameter: '../other' }, { provider: 'youtube', parameter: 'invalid' }, { provider: 'unknown', parameter: 'lcp' }] }]))), []);
  assert.deepEqual(findLolMatchStreams(match, parseLolSchedule(html([{ ...raw, state: 'unstarted' }]))), []);
});
test('one page read resolves all eligible targets and records source provenance', async () => {
  let calls = 0;
  const target = { ...match, id: 1, league: 'LCP P&R', serie: '2026' };
  const result = await loadLolStreams([target, { ...target, id: 2, status: 'finished' }], async () => { calls++; return html([raw]); });
  assert.equal(calls, 1);
  assert.equal(result[1][0].source, 'LoL Esports');
  assert.equal(result[1][0].sourceUrl, 'https://lolesports.com/en-US');
  assert.equal(result[2], undefined);
  assert.equal(findLolMatchStreams({ ...match, beginAt: '2026-11-11T09:04:00Z', scheduledAt: raw.startTime }, parseLolSchedule(html([raw]))).length, 2);
});
test('source failure and empty targets return no links', async () => {
  const target = { ...match, id: 1, league: 'LCP', serie: '2026' };
  assert.deepEqual(await loadLolStreams([target], async () => null), {});
  assert.deepEqual(await loadLolStreams([target], async () => { throw new Error('offline'); }), {});
  assert.deepEqual(await loadLolStreams([], async () => { throw new Error('should not call'); }), {});
});
test('malformed and oversized responses fail closed', () => {
  assert.deepEqual(parseLolSchedule(html([raw]).slice(0, -20)), []);
  assert.deepEqual(parseLolSchedule(' '.repeat(6_000_001)), []);
});
