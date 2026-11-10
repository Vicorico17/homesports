const INTERVAL_MS = 60_000;
const MAX_DELAY_MS = 15 * INTERVAL_MS;

export type PollingEnvironment = {
  now: () => number;
  isActive: () => boolean;
  schedule: (callback: () => void, delay: number) => () => void;
  subscribe: (callback: () => void) => () => void;
};

function browserEnvironment(): PollingEnvironment {
  return {
    now: Date.now,
    isActive: () => document.visibilityState === "visible" && navigator.onLine,
    schedule: (callback, delay) => {
      const timer = window.setTimeout(callback, delay);
      return () => window.clearTimeout(timer);
    },
    subscribe: (callback) => {
      document.addEventListener("visibilitychange", callback);
      window.addEventListener("online", callback);
      window.addEventListener("offline", callback);
      return () => {
        document.removeEventListener("visibilitychange", callback);
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
      };
    },
  };
}

/** Server-rendered data covers the first minute. Refresh only while someone can see it. */
export function startClientPolling(
  refresh: (signal: AbortSignal) => Promise<void>,
  environment: PollingEnvironment = browserEnvironment(),
): () => void {
  let stopped = false;
  let controller: AbortController | undefined;
  let cancelTimer: (() => void) | undefined;
  let failures = 0;
  let dueAt = environment.now() + INTERVAL_MS;

  function schedule() {
    cancelTimer?.();
    cancelTimer = undefined;
    if (stopped || controller || !environment.isActive()) return;
    cancelTimer = environment.schedule(() => { void run(); }, Math.max(0, dueAt - environment.now()));
  }

  async function run() {
    cancelTimer = undefined;
    if (stopped || controller || !environment.isActive()) return;
    const request = new AbortController();
    controller = request;
    try {
      await refresh(request.signal);
      if (!request.signal.aborted) failures = 0;
    } catch {
      if (!request.signal.aborted) failures = Math.min(failures + 1, 4);
    } finally {
      const delay = Math.min(INTERVAL_MS * 2 ** failures, MAX_DELAY_MS);
      dueAt = environment.now() + delay;
      controller = undefined;
      schedule();
    }
  }

  const unsubscribe = environment.subscribe(() => {
    if (!environment.isActive()) controller?.abort();
    schedule();
  });
  schedule();
  return () => {
    stopped = true;
    cancelTimer?.();
    controller?.abort();
    unsubscribe();
  };
}
