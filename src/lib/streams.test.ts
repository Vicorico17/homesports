import test from 'node:test';
import assert from 'node:assert/strict';
import { directStreamUrl, normalizeMatchStreams, streamAvailability } from './streams.ts';

test('normalizes only direct viewing pages and safe provider embed URLs', () => {
  assert.equal(directStreamUrl('http://www.twitch.tv/RiotGames?foo=bar'), 'https://www.twitch.tv/riotgames');
  assert.equal(directStreamUrl('https://player.twitch.tv/?channel=VALORANT&parent=example.com'), 'https://www.twitch.tv/valorant');
  assert.equal(directStreamUrl('https://www.youtube.com/embed/abcdefghijk'), 'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(directStreamUrl('https://youtu.be/abcdefghijk?t=40'), 'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(directStreamUrl('https://www.youtube.com/@LCK/streams'), 'https://www.youtube.com/@LCK/live');
  assert.equal(directStreamUrl('https://live.bilibili.com/7734200'), 'https://live.bilibili.com/7734200');
  assert.equal(directStreamUrl('http://play.sooplive.co.kr/afchall'), 'https://play.sooplive.co.kr/afchall');
});

test('rejects unsafe, indirect and unsupported links instead of inventing a stream', () => {
  for (const url of [null, '', {}, 'javascript:alert(1)', 'data:text/html,test', '//www.twitch.tv/valorant', 'https://twitch.tv.attacker.test/valorant', 'https://user:pass@www.twitch.tv/valorant', 'https://www.twitch.tv:8443/valorant', 'https://www.twitch.tv/directory', 'https://www.twitch.tv/videos/12345', 'https://www.youtube.com/results?search_query=valorant', 'https://www.youtube.com/watch?v=short', 'https://example.com/watch', 'https://www.vlr.gg/matches/', 'https://www.twitch.tv/\nvalorant']) assert.equal(directStreamUrl(url), null, String(url));
});

test('keeps official/main priority, all languages and merges equivalent duplicates', () => {
  const streams = normalizeMatchStreams({ streams_list: [
    { raw_url: 'https://www.twitch.tv/secondary', language: 'en', official: false },
    { raw_url: 'http://www.twitch.tv/MAIN', language: 'ko', official: true },
    { raw_url: 'https://www.twitch.tv/main/', main: true },
    { raw_url: 'https://www.twitch.tv/official', language: 'en', official: true },
    null, { raw_url: 12 },
  ] });
  assert.deepEqual(streams.map(stream => stream.url), ['https://www.twitch.tv/main', 'https://www.twitch.tv/official', 'https://www.twitch.tv/secondary']);
  assert.equal(streams[0].language, 'ko'); assert.equal(streams[0].main, true);
});

test('recovers exact-match embed and legacy fields but never stale legacy over current data', () => {
  assert.equal(normalizeMatchStreams({ streams_list: [{ embed_url: 'https://player.twitch.tv/?channel=league' }] })[0].url, 'https://www.twitch.tv/league');
  assert.equal(normalizeMatchStreams({ streams: { official: { raw_url: 'https://www.twitch.tv/league' } } })[0].official, true);
  assert.equal(normalizeMatchStreams({ official_stream_url: 'https://www.twitch.tv/league' })[0].url, 'https://www.twitch.tv/league');
  assert.deepEqual(normalizeMatchStreams({ streams_list: [{ raw_url: 'https://www.twitch.tv/new' }], official_stream_url: 'https://www.twitch.tv/stale' }).map(stream => stream.url), ['https://www.twitch.tv/new']);
  assert.deepEqual(normalizeMatchStreams({ streams_list: {} }), []);
  assert.deepEqual(normalizeMatchStreams({}), []);
});

test('only running matches expose streams; all non-live statuses hide controls', () => {
  const streams = normalizeMatchStreams({ streams_list: [{ raw_url: 'https://www.twitch.tv/valorant' }, { raw_url: 'https://www.twitch.tv/valorant_alt' }] });
  const original = structuredClone(streams);
  for (const status of ['upcoming', 'not_started', 'finished', 'canceled', 'cancelled', 'postponed', 'unknown', '']) {
    assert.deepEqual(streamAvailability(status, streams), { label: '', available: false }, status);
    assert.deepEqual(streamAvailability(status, []), { label: '', available: false }, status);
  }
  assert.deepEqual(streamAvailability('running', streams), { label: 'Watch live', available: true });
  assert.deepEqual(streamAvailability('running', []), { label: 'No verified stream available', available: false });
  // Status changes hide controls without deleting primary or alternate stream data.
  for (const status of ['upcoming', 'running', 'finished', 'running']) streamAvailability(status, streams);
  assert.deepEqual(streams, original);
  assert.equal(streams.length, 2);
});
