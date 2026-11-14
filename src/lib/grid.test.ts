import test from "node:test";
import assert from "node:assert/strict";
import { getGridFinal } from "./grid.ts";

test("GRID stays disconnected without credentials and makes no network request", async t => {
  const key = process.env.GRID_API_KEY;
  delete process.env.GRID_API_KEY;
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw Error("Unexpected request"); });
  try {
    assert.equal((await getGridFinal()).status, "not-configured");
    assert.equal(fetch.mock.callCount(), 0);
  } finally { if (key !== undefined) process.env.GRID_API_KEY = key; }
});

test("GRID falls back to core fields and rejects failed responses without returning secrets", async t => {
  const key = process.env.GRID_API_KEY;
  const id = process.env.GRID_WORLDS_FINAL_SERIES_ID;
  process.env.GRID_API_KEY = "test-only-key";
  process.env.GRID_WORLDS_FINAL_SERIES_ID = "123";
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    assert.equal((init.headers as Record<string, string>)["x-api-key"], "test-only-key");
    requests++;
    return Response.json(requests === 1 ? { errors: [{ message: "Field unavailable" }] } : { data: { seriesState: { id: "123", valid: true, teams: [{ id: "a", name: "A", score: 0 }, { id: "b", name: "B", score: 1 }] } } });
  });
  try {
    const feed = await getGridFinal();
    assert.equal(requests, 2);
    assert.equal(feed.status, "ready");
    assert.equal(feed.state?.teams[0].score, 0);
    assert.equal(JSON.stringify(feed).includes("test-only-key"), false);
    t.mock.method(globalThis, "fetch", async () => Response.json({ data: {} }));
    assert.equal((await getGridFinal()).status, "pending");
    t.mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status: 503 }));
    assert.equal((await getGridFinal()).status, "unavailable");
  } finally {
    if (key === undefined) delete process.env.GRID_API_KEY; else process.env.GRID_API_KEY = key;
    if (id === undefined) delete process.env.GRID_WORLDS_FINAL_SERIES_ID; else process.env.GRID_WORLDS_FINAL_SERIES_ID = id;
  }
});
