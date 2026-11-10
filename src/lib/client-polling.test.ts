import test from "node:test";
import assert from "node:assert/strict";
import { startClientPolling, type PollingEnvironment } from "./client-polling.ts";

function harness() {
  let now = 0;
  let visible = true;
  let online = true;
  let listener: (() => void) | undefined;
  let timer: { callback: () => void; due: number } | undefined;
  const environment: PollingEnvironment = {
    now: () => now,
    isActive: () => visible && online,
    schedule: (callback, delay) => {
      assert.equal(timer, undefined, "only one timer may be scheduled");
      timer = { callback, due: now + delay };
      return () => { timer = undefined; };
    },
    subscribe: (callback) => { listener = callback; return () => { listener = undefined; }; },
  };
  return {
    environment,
    delay: () => timer ? timer.due - now : undefined,
    subscribed: () => Boolean(listener),
    visible: (value: boolean) => { visible = value; listener?.(); },
    online: (value: boolean) => { online = value; listener?.(); },
    async advance(ms: number) {
      now += ms;
      if (timer && timer.due <= now) {
        const callback = timer.callback;
        timer = undefined;
        callback();
      }
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

test("uses initial server data, then polls every minute and cleans up", async () => {
  const clock = harness();
  let calls = 0;
  const stop = startClientPolling(async () => { calls++; }, clock.environment);
  assert.equal(calls, 0);
  await clock.advance(59_999);
  assert.equal(calls, 0);
  await clock.advance(1);
  assert.equal(calls, 1);
  assert.equal(clock.delay(), 60_000);
  stop();
  assert.equal(clock.delay(), undefined);
  assert.equal(clock.subscribed(), false);
  await clock.advance(60_000);
  assert.equal(calls, 1);
});

test("hidden/offline tabs pause and resume overdue refresh without focus bursts", async () => {
  const clock = harness();
  let calls = 0;
  const stop = startClientPolling(async () => { calls++; }, clock.environment);
  clock.visible(false);
  await clock.advance(120_000);
  assert.equal(calls, 0);
  assert.equal(clock.delay(), undefined);
  clock.online(false);
  clock.visible(true);
  assert.equal(clock.delay(), undefined);
  clock.online(true);
  await clock.advance(0);
  assert.equal(calls, 1);
  clock.visible(false);
  clock.visible(true);
  await clock.advance(0);
  assert.equal(calls, 1);
  assert.equal(clock.delay(), 60_000);
  stop();
});

test("slow requests never overlap; hiding aborts and waits for settlement", async () => {
  const clock = harness();
  let calls = 0;
  let signal: AbortSignal | undefined;
  let finish: (() => void) | undefined;
  const stop = startClientPolling((requestSignal) => {
    calls++;
    signal = requestSignal;
    return new Promise<void>(resolve => { finish = resolve; });
  }, clock.environment);
  await clock.advance(60_000);
  await clock.advance(180_000);
  assert.equal(calls, 1);
  clock.visible(false);
  assert.equal(signal?.aborted, true);
  clock.visible(true);
  await clock.advance(60_000);
  assert.equal(calls, 1);
  finish?.();
  await clock.advance(0);
  assert.equal(clock.delay(), 60_000);
  await clock.advance(60_000);
  assert.equal(calls, 2);
  stop();
  assert.equal(signal?.aborted, true);
  finish?.();
  await clock.advance(0);
  assert.equal(clock.delay(), undefined);
});

test("errors back off to fifteen minutes, preserve backoff across focus, and reset on success", async () => {
  const clock = harness();
  let fail = true;
  const stop = startClientPolling(async () => { if (fail) throw Error("unavailable"); }, clock.environment);
  await clock.advance(60_000);
  for (const expected of [120_000, 240_000, 480_000, 900_000, 900_000]) {
    assert.equal(clock.delay(), expected);
    clock.visible(false);
    clock.visible(true);
    assert.equal(clock.delay(), expected);
    await clock.advance(expected);
  }
  fail = false;
  await clock.advance(900_000);
  assert.equal(clock.delay(), 60_000);
  stop();
});

test("mounting while offline does not issue requests", async () => {
  const clock = harness();
  clock.online(false);
  let calls = 0;
  const stop = startClientPolling(async () => { calls++; }, clock.environment);
  await clock.advance(300_000);
  assert.equal(calls, 0);
  clock.online(true);
  await clock.advance(0);
  assert.equal(calls, 1);
  stop();
});
