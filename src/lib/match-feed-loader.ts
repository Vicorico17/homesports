import type { Game } from "./game.ts";
import type { MatchFeed, MatchStatus, PandaMatch } from "./matches.ts";

type PageResult = { data: PandaMatch[] | null; sourceDate: string | null; status: number };
type PageRequest = (path: string, revalidate: number) => Promise<PageResult>;
export type MatchGroup = { matches: PandaMatch[]; status: MatchStatus; sourceDate: string | null; revalidate?: number };

/** Fetch second pages only when the first is full; one failed page must not discard other results. */
export async function loadMatchPages(game: Game, request: PageRequest) {
  let complete = true;
  async function page(path: string, status: MatchStatus, number: number): Promise<MatchGroup> {
    const sort = path === "past" ? "-begin_at" : "begin_at";
    // Keep live scores and newly completed results fresh; older history and
    // advance schedules do not need an identical once-per-minute budget.
    const revalidate = path === "upcoming" ? 300 : path === "past" && number > 1 ? 600 : 60;
    const result = await request(`${game}/matches/${path}?sort=${sort}&per_page=100&page=${number}`, revalidate);
    if (!Array.isArray(result.data)) complete = false;
    return { matches: Array.isArray(result.data) ? result.data : [], status, sourceDate: result.sourceDate, revalidate };
  }
  const [running, upcoming, past] = await Promise.all([
    page("running", "running", 1), page("upcoming", "upcoming", 1), page("past", "finished", 1),
  ]);
  const more = await Promise.all([
    ...(upcoming.matches.length === 100 ? [page("upcoming", "upcoming", 2)] : []),
    ...(past.matches.length === 100 ? [page("past", "finished", 2)] : []),
  ]);
  return { groups: [running, upcoming, past, ...more], complete };
}

/** Bad records degrade the snapshot without throwing away valid groups. */
export function normalizeMatchGroups<T>(groups: MatchGroup[], normalize: (match: PandaMatch, status: MatchStatus) => T) {
  let complete = true;
  const normalized = groups.map(group => ({ ...group, matches: group.matches.flatMap(match => {
    try {
      if (!match || !Number.isSafeInteger(match.id) || typeof match.name !== "string") throw Error("Invalid match record");
      return [normalize(match, group.status)];
    } catch {
      complete = false;
      return [];
    }
  }) }));
  return { groups: normalized, complete };
}

// Throwing from Next's cached loader retains its last successful shared snapshot.
// Private storage keeps the partial feed out of error logs while allowing the
// first-ever request (no cached snapshot) to display whatever did succeed.
export class MatchFeedUnavailable extends Error {
  #feed: MatchFeed;
  constructor(feed: MatchFeed) {
    super(`PandaScore ${feed.game} feed refresh incomplete; retaining the previous snapshot when available.`);
    this.name = "MatchFeedUnavailable";
    this.#feed = feed;
  }
  fallback() { return this.#feed; }
}

export function markStaleFeed(feed: MatchFeed, now = Date.now()): MatchFeed {
  // Legacy snapshots retain their conservative three-minute deadline.
  const deadline = feed.freshUntil ? Date.parse(feed.freshUntil) : Date.parse(feed.updatedAt) + 180_000;
  return !feed.demo && (!Number.isFinite(deadline) || now > deadline)
    ? { ...feed, sourceStatus: "unavailable" }
    : feed;
}

/** Collapse concurrent regeneration in this warm process; the Data Cache shares completed results. */
export function singleFlight<Key, Value>(loader: (key: Key) => Promise<Value>) {
  const pending = new Map<Key, Promise<Value>>();
  return (key: Key): Promise<Value> => {
    const existing = pending.get(key);
    if (existing) return existing;
    const promise = loader(key).finally(() => { pending.delete(key); });
    pending.set(key, promise);
    return promise;
  };
}

/** Empty pages are freshness evidence too, especially an empty running feed. */
export function feedFreshUntil(groups: MatchGroup[], now = Date.now()): string {
  const deadlines = groups.map(group => {
    const timestamp = group.sourceDate ? Date.parse(group.sourceDate) : NaN;
    return Number.isFinite(timestamp) ? timestamp + ((group.revalidate ?? 60) + 120) * 1000 : now;
  });
  return new Date(deadlines.length ? Math.min(...deadlines) : now).toISOString();
}

/** Slow schedule pages can overlap newer live/results pages during transitions. */
export function mergeMatchGroups<T extends { id: number; status: MatchStatus }>(groups: Array<{ matches: T[]; sourceDate: string | null }>): T[] {
  const selected = new Map<number, { match: T; timestamp: number }>();
  const rank = { upcoming: 0, running: 1, finished: 2 };
  for (const group of groups) {
    const parsed = group.sourceDate ? Date.parse(group.sourceDate) : NaN;
    const timestamp = Number.isFinite(parsed) ? parsed : -Infinity;
    for (const match of group.matches) {
      const previous = selected.get(match.id);
      if (!previous || timestamp > previous.timestamp || (timestamp === previous.timestamp && rank[match.status] > rank[previous.match.status])) {
        selected.set(match.id, { match, timestamp });
      }
    }
  }
  return [...selected.values()].map(item => item.match);
}
