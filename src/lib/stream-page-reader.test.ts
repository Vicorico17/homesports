import test from 'node:test';
import assert from 'node:assert/strict';
import { createStreamPageReader as createReader, createStreamPageCache } from './stream-page-reader.ts';
const createStreamPageReader = (fetcher: typeof fetch, timeout = 8000) => createReader(fetcher, timeout, createStreamPageCache());
const response = (body = 'page') => new Response(body, {headers:{'content-type':'text/html'}});
test('source reader coalesces URLs, limits concurrency and rejects unexpected destinations', async () => {
  let active = 0, max = 0, calls = 0;
  const read = createStreamPageReader(async (_url, options) => { calls++; active++; max = Math.max(max, active); assert.equal(options?.credentials, 'omit'); assert.equal(options?.redirect, 'error'); await new Promise(resolve => setTimeout(resolve, 5)); active--; return response(); });
  const a = read('https://www.vlr.gg/matches/');
  const same = read('https://www.vlr.gg/matches/');

  assert.equal(await read('https://example.com/'), null);
  const result = await Promise.all([a, read('https://www.vlr.gg/events/'), read('https://www.vlr.gg/1/team-a-vs-team-b')]);
  assert.deepEqual(result, ['page','page','page']); assert.equal(await same, 'page'); assert.equal(calls, 3); assert.equal(max, 2);
});
test('source errors, wrong content and oversized responses fail closed', async () => {
  assert.equal(await createStreamPageReader(async () => { throw Error('outage'); })('https://lolesports.com/en-US'), null);
  assert.equal(await createStreamPageReader(async () => new Response('{}'))('https://lolesports.com/en-US'), null);
  assert.equal(await createStreamPageReader(async () => response('x'.repeat(2_000_001)))('https://www.vlr.gg/matches/'), null);
});
test('shared deadline expires queued work without another network call', async () => {
  let calls = 0;
  const read = createStreamPageReader(async (_url, options) => { calls++; await new Promise((_, reject) => options?.signal?.addEventListener('abort', () => reject(Error('timeout')), {once:true})); return response(); }, 15);
  // Keep the test event loop alive while AbortSignal's unreferenced deadline fires.
  const timer = setTimeout(() => {}, 100);
  const result = await Promise.all([read('https://www.vlr.gg/matches/'), read('https://www.vlr.gg/events/'), read('https://www.vlr.gg/1/first')]);
  clearTimeout(timer); assert.deepEqual(result, [null,null,null]); assert.equal(calls, 2);
});

 test('independent readers share cache, pending work and concurrency', async () => {
  const cache = createStreamPageCache(); let calls = 0, active = 0, maximum = 0;
  const fetcher: typeof fetch = async () => { calls++; active++; maximum = Math.max(maximum, active); await new Promise(resolve => setTimeout(resolve, 5)); active--; return response(); };
  const a = createReader(fetcher, 8000, cache), b = createReader(fetcher, 8000, cache);
  await Promise.all([a('https://www.vlr.gg/matches/'), b('https://www.vlr.gg/matches/'), a('https://www.vlr.gg/events/'), b('https://www.vlr.gg/1/match')]);
  await b('https://www.vlr.gg/events/'); assert.equal(calls, 3); assert.equal(maximum, 2);
});
