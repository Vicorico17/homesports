import { mkdir, readFile, open, rename, rm, stat } from "node:fs/promises";
import { unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

/** One process per persistent volume. Never pretend process memory is durable. */
export function createFilePersistence({ filename = resolve(process.env.PICK_PREDICT_DATA_FILE || ".data/pick-predict.json"), serverless = Boolean(process.env.VERCEL) } = {}) {
  const lockfile = `${filename}.lock`;
  let lock;
  const removeLock = () => { if (lock) { try { unlinkSync(lockfile); } catch {} } };
  async function acquire() {
    if (serverless) throw new Error("Shared transactional storage is required for serverless deployments.");
    if (lock) return;
    await mkdir(dirname(filename), { recursive: true, mode: 0o700 });
    try { lock = await open(lockfile, "wx", 0o600); }
    catch (error) { if (error.code === "EEXIST") throw new Error("Storage is locked by another process or an interrupted run. Verify the previous server has stopped before clearing its lock."); throw error; }
    await lock.writeFile(`${process.pid}\n`);
    process.once("exit", removeLock);
  }
  return {
    mode: serverless ? "unavailable" : "single-process-file",
    async load() {
      await acquire();
      try {
        if ((await stat(filename)).size > 20 * 1024 * 1024) throw new Error("Recovery file exceeds the supported size.");
        return JSON.parse(await readFile(filename, "utf8"));
      } catch (error) { if (error.code === "ENOENT") return null; throw error; }
    },
    async save(snapshot) {
      await acquire();
      const contents = JSON.stringify(snapshot);
      if (Buffer.byteLength(contents) > 20 * 1024 * 1024) throw new Error("Recovery file exceeds the supported size.");
      const temporary = `${filename}.${randomUUID()}.tmp`;
      let file;
      try {
        file = await open(temporary, "wx", 0o600);
        await file.writeFile(contents);
        await file.sync();
        await file.close(); file = null;
        await rename(temporary, filename);
      } finally {
        if (file) await file.close();
        // Cleanup must not report a committed rename as a failed transaction.
        await rm(temporary, { force: true }).catch(() => {});
      }
    },
    async close() {
      process.removeListener("exit", removeLock);
      if (lock) { await lock.close(); removeLock(); lock = null; }
    },
  };
}
