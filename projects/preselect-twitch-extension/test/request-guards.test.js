import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createRateLimiter, readJsonBody } from "../src/request-guards.js";

test("rate limits include retry timing and expire without unbounded key growth", () => {
  let time = 1000;
  const limit = createRateLimiter({ now: () => time, maximumKeys: 2 });
  limit("viewer", 2); limit("viewer", 2);
  assert.throws(() => limit("viewer", 2), error => error.status === 429 && error.retryAfter === 60);
  limit("second", 1);
  assert.throws(() => limit("third", 1), error => error.status === 503);
  time += 60001;
  assert.doesNotThrow(() => limit("third", 1));
});

test("chunked bodies cannot bypass the byte limit", async () => {
  const body = Readable.from([Buffer.from('{"value":"'), Buffer.alloc(100), Buffer.from('"}')]);
  body.headers = { "content-type": "application/json" };
  await assert.rejects(readJsonBody(body, 64), error => error.status === 413);
});

test("invalid JSON and nonobject bodies are rejected", async () => {
  for (const value of ["null", "[]", "1", '"text"', "{"]) {
    const body = Readable.from([Buffer.from(value)]);
    body.headers = { "content-type": "application/json" };
    await assert.rejects(readJsonBody(body), error => error.status === 400);
  }
});
