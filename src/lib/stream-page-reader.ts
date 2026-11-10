/** Credential-free source cache shared by board, previews and Worlds in a warm process. */
export function createStreamPageCache() {
  return { entries: new Map<string, { html: string | null; expires: number }>(), pending: new Map<string, Promise<string | null>>(), active: 0, queue: [] as (() => void)[], bytes: 0 };
}
const sharedCache = createStreamPageCache();
const TTL = 300_000;
const MAX_CACHE_BYTES = 20_000_000;

export function createStreamPageReader(fetcher: typeof fetch = fetch, timeoutMs = 8_000, cache = sharedCache) {
  const signal = AbortSignal.timeout(timeoutMs);
  let attempts = 0;
  return function read(url: string): Promise<string | null> {
    const allowed = url === 'https://lolesports.com/en-US' || /^https:\/\/www\.vlr\.gg\/(?:matches\/|events\/|event\/\d+\/[a-z\d-]+\/?|\d+\/[a-z\d-]+\/?)$/i.test(url);
    if (!allowed || signal.aborted) return Promise.resolve(null);
    const existing = cache.entries.get(url);
    if (existing && existing.expires > Date.now()) return Promise.resolve(existing.html);
    if (existing) { cache.bytes -= (existing.html?.length ?? 0) * 2; cache.entries.delete(url); }
    const pending = cache.pending.get(url);
    if (pending) return waitWithinDeadline(pending, signal);
    if (attempts >= 13) return Promise.resolve(null);
    attempts++;
    const operation = (async (): Promise<string | null> => {
      if (cache.active >= 2) await new Promise<void>(resolve => cache.queue.push(resolve));
      cache.active++;
      try {
        if (signal.aborted) return null;
        const response = await fetcher(url, { signal, redirect: 'error', credentials: 'omit', headers: { Accept: 'text/html' } });
        const limit = url.includes('lolesports.com') ? 6_000_000 : 2_000_000;
        if (!response.ok || !response.headers.get('content-type')?.includes('text/html') || Number(response.headers.get('content-length') ?? 0) > limit || !response.body) { await response.body?.cancel(); return null; }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let bytes = 0, html = '';
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > limit || signal.aborted) { await reader.cancel(); return null; }
            html += decoder.decode(value, { stream: true });
          }
          return html + decoder.decode();
        } finally { reader.releaseLock(); }
      } catch { return null; }
      finally { cache.active--; cache.queue.shift()?.(); }
    })().then(html => {
      const bytes = (html?.length ?? 0) * 2;
      while (cache.entries.size >= 40 || cache.bytes + bytes > MAX_CACHE_BYTES) {
        const oldest = cache.entries.keys().next().value;
        if (oldest == null) break;
        cache.bytes -= (cache.entries.get(oldest)?.html?.length ?? 0) * 2;
        cache.entries.delete(oldest);
      }
      cache.entries.set(url, { html, expires: Date.now() + TTL });
      cache.bytes += bytes;
      return html;
    }).finally(() => { cache.pending.delete(url); });
    cache.pending.set(url, operation);
    return waitWithinDeadline(operation, signal);
  };
}
function waitWithinDeadline(promise: Promise<string | null>, signal: AbortSignal) {
  if (signal.aborted) return Promise.resolve(null);
  return new Promise<string | null>(resolve => {
    const aborted = () => { resolve(null); };
    signal.addEventListener('abort', aborted, { once: true });
    promise.then(value => { signal.removeEventListener('abort', aborted); resolve(value); }, () => { signal.removeEventListener('abort', aborted); resolve(null); });
  });
}
