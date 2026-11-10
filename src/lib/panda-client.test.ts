import { AsyncLocalStorage } from 'node:async_hooks';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPandaClient } from './panda-client.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function clock() {
  let time = Date.parse('2026-01-01T00:00:00Z');
  const timers = new Map<() => void, number>();
  return {
    now: () => time,
    schedule(callback: () => void, milliseconds: number) {
      timers.set(callback, time + milliseconds);
      return () => { timers.delete(callback); };
    },
    advance(milliseconds: number) {
      time += milliseconds;
      for (const [callback, at] of timers) if (at <= time) { timers.delete(callback); callback(); }
    },
    pending: () => timers.size,
  };
}
const getToken = () => 'test-only-placeholder';
const logFailure = () => {};

test('coalesces fetch and JSON parsing and isolates consumer payloads', async () => {
  const response = deferred<Response>();
  let calls = 0;
  let parses = 0;
  const client = createPandaClient({ getToken, logFailure, fetch: async (_url, init) => {
    calls++;
    assert.deepEqual(init.next, { revalidate: 30 });
    return calls === 1 ? response.promise : new Response(JSON.stringify({ names: ['team'] }));
  } });
  const a = client.request<{ names: string[] }>('lol/matches', 30);
  const b = client.request<{ names: string[] }>('lol/matches', 30);
  const body = new Response(JSON.stringify({ names: ['team'] }), { headers: { date: 'Thu, 01 Jan 2026 00:00:00 GMT' } });
  const json = body.json.bind(body);
  body.json = () => { parses++; return json(); };
  response.resolve(body);
  const [one, two] = await Promise.all([a, b]);
  assert.equal(calls, 1);
  assert.equal(parses, 1);
  assert.equal(one.sourceDate, 'Thu, 01 Jan 2026 00:00:00 GMT');
  one.data!.names.push('changed');
  assert.deepEqual(two.data, { names: ['team'] });
  await client.request('lol/matches', 30);
  assert.equal(calls, 2, 'completed flights are not a persistent result cache');
});

test('different TTLs have separate flights and default maximum concurrency is three', async () => {
  const pending: Array<ReturnType<typeof deferred<Response>>> = [];
  let active = 0;
  let max = 0;
  const client = createPandaClient({ getToken, logFailure, fetch: async () => {
    active++;
    max = Math.max(max, active);
    const response = deferred<Response>();
    pending.push(response);
    return response.promise.finally(() => { active--; });
  } });
  const requests = [client.request('same', 10), client.request('same', 20), ...[1, 2, 3].map(n => client.request(`other/${n}`))];
  assert.equal(pending.length, 3);
  for (let i = 0; i < 5; i++) {
    pending[i].resolve(new Response('[]'));
    await tick();
  }
  await Promise.all(requests);
  assert.equal(max, 3);
  assert.equal(pending.length, 5);
});

for (const mode of ['seconds', 'date', 'missing', 'invalid'] as const) {
  test(`429 ${mode} Retry-After cools down all paths and immediately drains queued callers`, async () => {
    const time = clock();
    const first = deferred<Response>();
    const failures: Array<[string, number]> = [];
    let calls = 0;
    const client = createPandaClient({ getToken, ...time, maxConcurrency: 1,
      logFailure: (path, status) => { failures.push([path, status]); },
      fetch: async () => { calls++; return calls === 1 ? first.promise : new Response('[]'); },
    });
    const running = client.request('lol/matches?token=must-not-log');
    const queued = client.request('csgo/matches');
    const seconds = mode === 'missing' || mode === 'invalid' ? 60 : 12;
    const headers = new Headers();
    if (mode !== 'missing') headers.set('retry-after', mode === 'seconds' ? '12' : mode === 'date' ? new Date(time.now() + 12000).toUTCString() : 'nonsense');
    first.resolve(new Response(null, { status: 429, headers }));
    assert.equal((await running).retryAfterSeconds, seconds);
    assert.equal((await queued).status, 429);
    assert.equal((await client.request('dota2/matches')).retryAfterSeconds, seconds);
    assert.equal(calls, 1);
    assert.deepEqual(failures, [['lol/matches', 429]]);
    time.advance((seconds - 1) * 1000);
    assert.equal((await client.request('other')).retryAfterSeconds, 1);
    time.advance(1000);
    assert.equal((await client.request('other')).status, 200);
    assert.equal(calls, 2);
    assert.equal(time.pending(), 0);
  });
}

test('timeout aborts, frees the slot, clears flight, and recovers even if fetch ignores abort', async () => {
  const time = clock();
  let calls = 0;
  let signal: AbortSignal | undefined;
  const failures: number[] = [];
  const client = createPandaClient({ getToken, ...time, maxConcurrency: 1, timeoutMs: 100,
    logFailure: (_path, status) => { failures.push(status); },
    fetch: async (_url, init) => {
      calls++;
      if (calls === 1) { signal = init.signal as AbortSignal; return new Promise(() => {}); }
      return new Response('[]');
    },
  });
  const hung = client.request('hung');
  const queued = client.request('queued');
  time.advance(100);
  assert.equal((await hung).status, 0);
  assert.equal(signal!.aborted, true);
  assert.equal((await queued).status, 0);
  assert.equal((await client.request('hung')).status, 200);
  assert.deepEqual(failures, [0]);
  assert.equal(time.pending(), 0);
});

test('network, HTTP and JSON failures log once per flight and allow later success', async () => {
  let calls = 0;
  const failures: number[] = [];
  const client = createPandaClient({ getToken, logFailure: (_path, status) => { failures.push(status); }, fetch: async () => {
    calls++;
    if (calls === 1) throw new Error('secret must not be logged');
    if (calls === 2) return new Response(null, { status: 503 });
    if (calls === 3) return new Response('invalid json');
    return new Response('[]');
  } });
  const a = client.request('path');
  const b = client.request('path');
  assert.equal((await a).data, null);
  assert.equal((await b).status, 0);
  assert.equal((await client.request('path')).status, 503);
  assert.equal((await client.request('path')).data, null);
  assert.deepEqual((await client.request('path')).data, []);
  assert.deepEqual(failures, [0, 503, 200]);
});

test('missing credentials do not fetch or log', async () => {
  const client = createPandaClient({ getToken: () => undefined,
    fetch: async () => { throw new Error('must not fetch'); },
    logFailure: () => { assert.fail('must not log missing credentials'); },
  });
  assert.deepEqual(await client.request('path'), { data: null, status: 0, sourceDate: null });
});


test('timeout also covers response body parsing', async () => {
  const time = clock();
  const failures: number[] = [];
  let calls = 0;
  const client = createPandaClient({ getToken, ...time, timeoutMs: 100,
    logFailure: (_path, status) => { failures.push(status); },
    fetch: async () => {
      calls++;
      const response = new Response('[]');
      if (calls === 1) response.json = () => new Promise(() => {});
      return response;
    },
  });
  const request = client.request('body');
  await tick();
  time.advance(100);
  assert.equal((await request).status, 0);
  assert.deepEqual(failures, [0]);
  assert.deepEqual((await client.request('body')).data, []);
});


test('queued requests preserve their originating async context', async () => {
  const storage = new AsyncLocalStorage<string>();
  const first = deferred<Response>();
  const seen: Array<string | undefined> = [];
  const client = createPandaClient({ getToken, logFailure, maxConcurrency: 1,
    fetch: async () => {
      seen.push(storage.getStore());
      if (seen.length === 1) return first.promise;
      await Promise.resolve();
      seen.push(storage.getStore());
      return new Response('[]');
    },
  });
  const a = storage.run('caller A', () => client.request('first'));
  const b = storage.run('caller B', () => client.request('second'));
  assert.deepEqual(seen, ['caller A']);
  first.resolve(new Response('[]'));
  await Promise.all([a, b]);
  assert.deepEqual(seen, ['caller A', 'caller B', 'caller B']);
});

test('queue bounds reject excess unique work but still coalesce queued paths', async () => {
  const first = deferred<Response>();
  let calls = 0;
  const client = createPandaClient({ getToken, logFailure, maxConcurrency: 1, maxQueueSize: 1,
    fetch: async () => { calls++; return calls === 1 ? first.promise : new Response('[]'); },
  });
  const a = client.request('first');
  const b = client.request('second');
  const same = client.request('second');
  assert.deepEqual(await client.request('overflow'), { data: null, status: 503, sourceDate: null });
  assert.equal(calls, 1);
  first.resolve(new Response('[]'));
  assert.ok((await Promise.all([a, b, same])).every(result => result.status === 200));
  assert.equal(calls, 2);
  assert.equal((await client.request('overflow')).status, 200);
  assert.equal(calls, 3);
});


test('queued requests expire at their enqueue deadline without fetch or upstream failure log', async () => {
  const time = clock();
  let calls = 0;
  const failures: Array<[string, number]> = [];
  const client = createPandaClient({ getToken, ...time, maxConcurrency: 1, timeoutMs: 100,
    logFailure: (path, status) => { failures.push([path, status]); },
    fetch: async () => {
      calls++;
      return calls === 1 ? new Promise(() => {}) : new Response('[]');
    },
  });
  const requests = ['active', 'queued1', 'queued2', 'queued3'].map(path => client.request(path));
  time.advance(100);
  const results = await Promise.all(requests);
  assert.ok(results.every(result => result.status === 0));
  assert.equal(calls, 1);
  assert.deepEqual(failures, [['active', 0]]);
  assert.equal(time.pending(), 0);
  assert.equal((await client.request('queued1')).status, 200);
  assert.equal(calls, 2);
  assert.equal(time.pending(), 0);
});

test('queue wait reduces the remaining fetch deadline rather than restarting it', async () => {
  const time = clock();
  const first = deferred<Response>();
  let calls = 0;
  const failures: Array<[string, number]> = [];
  const client = createPandaClient({ getToken, ...time, maxConcurrency: 1, timeoutMs: 100,
    logFailure: (path, status) => { failures.push([path, status]); },
    fetch: async () => { calls++; return calls === 1 ? first.promise : new Promise(() => {}); },
  });
  const a = client.request('first');
  const b = client.request('second');
  time.advance(75);
  first.resolve(new Response('[]'));
  await a;
  await tick();
  assert.equal(calls, 2);
  assert.equal(time.pending(), 1, 'queue timer was replaced, not duplicated');
  time.advance(25);
  assert.equal((await b).status, 0);
  assert.deepEqual(failures, [['second', 0]]);
  assert.equal(time.pending(), 0);
});
