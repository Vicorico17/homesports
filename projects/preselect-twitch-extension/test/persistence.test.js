import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFilePersistence } from "../src/persistence.js";

test("file persistence atomically saves, restores and releases its exclusive process lock", async t => {
  const directory = await mkdtemp(join(tmpdir(), "preselect-persistence-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filename = join(directory, "state.json");
  const first = createFilePersistence({ filename, serverless: false });
  const concurrent = createFilePersistence({ filename, serverless: false });
  t.after(() => first.close()); t.after(() => concurrent.close());
  assert.equal(await first.load(), null);
  await assert.rejects(concurrent.load(), /locked/);
  await first.save({ version: 3, channels: [["123", { state: "fixture" }]] });
  assert.equal(JSON.parse(await readFile(filename, "utf8")).channels[0][0], "123");
  assert.deepEqual((await readdir(directory)).sort(), ["state.json", "state.json.lock"]);
  await first.close();
  assert.equal((await concurrent.load()).version, 3);
  await concurrent.close();
  assert.deepEqual(await readdir(directory), ["state.json"]);
});

test("a corrupt recovery file fails instead of resetting or overwriting data", async t => {
  const directory = await mkdtemp(join(tmpdir(), "preselect-corrupt-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filename = join(directory, "state.json");
  await writeFile(filename, "{corrupted");
  const store = createFilePersistence({ filename, serverless: false });
  t.after(() => store.close());
  await assert.rejects(store.load());
  assert.equal(await readFile(filename, "utf8"), "{corrupted");
});

test("serverless persistence is explicitly unavailable, never a memory-only success", async () => {
  const store = createFilePersistence({ filename: "/tmp/not-written-preselect.json", serverless: true });
  assert.equal(store.mode, "unavailable");
  await assert.rejects(store.load(), /Shared transactional storage/);
  await assert.rejects(store.save({}), /Shared transactional storage/);
});
