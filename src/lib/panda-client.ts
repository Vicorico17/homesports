import { AsyncResource } from 'node:async_hooks';

export interface PandaResult<T> {
  data: T | null;
  status: number;
  sourceDate: string | null;
  retryAfterSeconds?: number;
}

type FetchOptions = RequestInit & { next: { revalidate: number } };
interface PandaClientOptions {
  fetch: (url: string, options: FetchOptions) => Promise<Response>;
  getToken: () => string | undefined;
  now?: () => number;
  schedule?: (callback: () => void, milliseconds: number) => () => void;
  maxConcurrency?: number;
  maxQueueSize?: number;
  timeoutMs?: number;
  defaultCooldownSeconds?: number;
  logFailure?: (path: string, status: number) => void;
}

function diagnosticPath(path: string): string {
  // Only retain the numeric page selector; omit credentials and all other query values.
  const [pathname, query = ""] = path.split("?", 2);
  const page = new URLSearchParams(query).get("page");
  return pathname.split("#", 1)[0] + (page && /^\d+$/.test(page) ? `?page=${page}` : "");
}

function retryDelay(value: string | null, now: number, fallback: number): number {
  if (value && /^\d+(?:\.\d+)?$/.test(value.trim())) {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.ceil(seconds);
  }
  if (value) {
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - now) / 1000));
  }
  return fallback;
}

/** A warm-process guard, not a distributed account-wide rate limiter. */
export function createPandaClient(options: PandaClientOptions) {
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? ((callback, milliseconds) => {
    const timer = setTimeout(callback, milliseconds);
    return () => clearTimeout(timer);
  });
  const limit = Math.max(1, Math.floor(options.maxConcurrency ?? 3));
  const queueLimit = Math.max(0, Math.floor(options.maxQueueSize ?? 100));
  const timeoutMs = options.timeoutMs ?? 10_000;
  const logFailure = options.logFailure ?? ((path, status) => {
    console.error(`PandaScore request failed: ${path} (status ${status})`);
  });
  const flights = new Map<string, Promise<PandaResult<unknown>>>();
  const queue: Array<{
    execute: () => Promise<PandaResult<unknown>>;
    deadline: number;
    cancelWait: () => void;
    resolve: (result: PandaResult<unknown>) => void;
  }> = [];
  let active = 0;
  let cooldownUntil = 0;
  const unavailable = (): PandaResult<unknown> => ({ data: null, status: 0, sourceDate: null });
  const coolingDown = (): PandaResult<unknown> => ({
    data: null, status: 429, sourceDate: null,
    retryAfterSeconds: Math.max(0, Math.ceil((cooldownUntil - now()) / 1000)),
  });

  async function execute(path: string, revalidate: number, deadline: number): Promise<PandaResult<unknown>> {
    const token = options.getToken();
    if (!token) return unavailable();
    const controller = new AbortController();
    let cancelTimeout = () => {};
    let status = 0;
    let sourceDate: string | null = null;
    try {
      const timeout = new Promise<never>((_, reject) => {
        cancelTimeout = schedule(() => {
          controller.abort();
          reject(new Error('PandaScore timeout'));
        }, Math.max(0, deadline - now()));
      });
      return await Promise.race([
        (async (): Promise<PandaResult<unknown>> => {
          const response = await options.fetch(`https://api.pandascore.co/${path}`, {
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate }, signal: controller.signal,
          });
          // A fetch implementation may ignore abort; do not process a late response.
          if (controller.signal.aborted) throw new Error('PandaScore timeout');
          status = response.status;
          sourceDate = response.headers.get('date');
          if (!response.ok) {
            let retryAfterSeconds: number | undefined;
            if (status === 429) {
              retryAfterSeconds = retryDelay(response.headers.get('retry-after'), now(), options.defaultCooldownSeconds ?? 60);
              cooldownUntil = Math.max(cooldownUntil, now() + retryAfterSeconds * 1000);
              drain();
            }
            logFailure(diagnosticPath(path), status);
            return { data: null, status, sourceDate, ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }) };
          }
          const data: unknown = await response.json();
          return { data, status, sourceDate };
        })(),
        timeout,
      ]);
    } catch {
      if (controller.signal.aborted) status = 0;
      logFailure(diagnosticPath(path), status);
      return { data: null, status, sourceDate };
    } finally {
      cancelTimeout();
    }
  }

  function drain() {
    if (cooldownUntil > now()) {
      for (const job of queue.splice(0)) {
        job.cancelWait();
        job.resolve(coolingDown());
      }
      return;
    }
    while (active < limit && queue.length) {
      const job = queue.shift()!;
      job.cancelWait();
      if (job.deadline <= now()) {
        job.resolve(unavailable());
        continue;
      }
      active++;
      void job.execute().then(job.resolve).finally(() => {
        active--;
        drain();
      });
    }
  }

  return {
    async request<T>(path: string, revalidate = 60): Promise<PandaResult<T>> {
      if (cooldownUntil > now()) return coolingDown() as PandaResult<T>;
      const key = JSON.stringify([path, revalidate]);
      let flight = flights.get(key);
      if (!flight) {
        // Bound memory and queue latency under bursts. Existing flights still coalesce.
        if (active >= limit && queue.length >= queueLimit) {
          return { data: null, status: 503, sourceDate: null };
        }
        // Next fetch reads request/work-unit AsyncLocalStorage. Queued work must
        // keep its caller's context, not inherit the previous job's completion.
        const deadline = now() + timeoutMs;
        const executeInCallerContext = AsyncResource.bind(() => execute(path, revalidate, deadline));
        flight = new Promise<PandaResult<unknown>>((resolve) => {
          const job = { execute: executeInCallerContext, resolve, deadline, cancelWait: () => {} };
          // Only one timer is live for a job: queue expiry is cancelled on start,
          // then execute uses the remaining deadline for fetch and body parsing.
          job.cancelWait = schedule(() => {
            const index = queue.indexOf(job);
            if (index === -1) return;
            queue.splice(index, 1);
            job.cancelWait();
            resolve(unavailable());
          }, timeoutMs);
          queue.push(job);
        }).finally(() => { flights.delete(key); });
        flights.set(key, flight);
        drain();
      }
      // Parse once, but isolate each consumer from mutations by another consumer.
      return structuredClone(await flight) as PandaResult<T>;
    },
  };
}
