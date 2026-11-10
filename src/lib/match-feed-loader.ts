import type { Game } from "./game.ts";
import type { MatchFeed, MatchStatus, PandaMatch } from "./matches.ts";

type PageResult = { data: PandaMatch[] | null; sourceDate: string | null; status: number };
type PageRequest = (path: string) => Promise<PageResult>;
export type MatchGroup = { matches: PandaMatch[]; status: MatchStatus; sourceDate: string | null };

/** Fetch second pages only when the first is full; one failed page must not discard other results. */
export async function loadMatchPages(game: Game, request: PageRequest) {
  let complete = true;
  async function page(path: string, status: MatchStatus, number: number): Promise<MatchGroup> {
    const sort = path === "past" ? "-begin_at" : "begin_at";
    const result = await request(`${game}/matches/${path}?sort=${sort}&per_page=100&page=${number}`);
    if (!Array.isArray(result.data)) complete = false;
    return { matches: Array.isArray(result.data) ? result.data : [], status, sourceDate: result.sourceDate };
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
  const timestamp = Date.parse(feed.updatedAt);
  return !feed.demo && (!Number.isFinite(timestamp) || now - timestamp > 180_000)
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
