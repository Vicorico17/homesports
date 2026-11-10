import { directStreamUrl, type MatchStream } from './streams.ts';
import type { StreamTarget, ReadStreamPage } from './vlr-stream-source.ts';

/** Riot's official schedule publishes streams on individual EventMatch records.
 * No credentials, team aliases, league-to-channel guesses, or VODs are used.
 * Source schema verified on https://lolesports.com/en-US (2026-11-10).
 */
export const LOL_SCHEDULE_URL = 'https://lolesports.com/en-US';
const MAX_BYTES = 6_000_000;
type Event = { id: string; startTime: string; state: string; teams: string[]; streams: MatchStream[] };
type Candidate = Pick<StreamTarget, 'status' | 'beginAt' | 'scheduledAt' | 'opponents'>;
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function team(value: string) { return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(); }
function knownTeam(value: string) { return !!value && !/^(tbd|tba|unknown|winner.*|loser.*)$/i.test(value); }
function streams(value: unknown): MatchStream[] {
  if (!Array.isArray(value)) return [];
  const result = new Map<string, MatchStream>();
  for (const raw of value.slice(0, 100)) {
    const entry = object(raw);
    if (!entry || typeof entry.parameter !== 'string') continue;
    // These provider parameters are published by Riot for this specific event.
    const url = entry.provider === 'twitch' && /^[a-z\d_]{1,25}$/i.test(entry.parameter)
      ? directStreamUrl(`https://www.twitch.tv/${entry.parameter}`)
      : entry.provider === 'youtube' && /^[a-z\d_-]{11}$/i.test(entry.parameter)
        ? directStreamUrl(`https://www.youtube.com/watch?v=${entry.parameter}`) : null;
    if (!url) continue;
    const locale = object(entry.mediaLocale)?.locale;
    const language = typeof locale === 'string' && /^[a-z]{2,3}(?:[-_][a-z]{2,4})?$/i.test(locale) ? locale.toLowerCase().replace('_', '-') : 'und';
    result.set(url, { url, language, official: true, source: 'LoL Esports', sourceUrl: LOL_SCHEDULE_URL });
  }
  return [...result.values()];
}

/** Parse only JSON event objects in Apollo's server-rendered data. Never evaluate page scripts. */
export function parseLolSchedule(html: string): Event[] {
  if (html.length > MAX_BYTES) return [];
  const events = new Map<string, Event>();
  const conflicts = new Set<string>();
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = script[1];
    if (!body.includes('ApolloSSRDataTransport')) continue;
    const marker = /\{\s*"__typename"\s*:\s*"EventMatch"/g;
    for (let found = marker.exec(body); found; found = marker.exec(body)) {
      let depth = 0, quoted = false, escaped = false, end = -1;
      for (let i = found.index; i < body.length; i++) {
        const c = body[i];
        if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
        else if (c === '"') quoted = true;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) { end = i + 1; break; }
      }
      if (end < 0) break;
      marker.lastIndex = end;
      try {
        const raw = JSON.parse(body.slice(found.index, end));
        if (typeof raw.id !== 'string' || typeof raw.startTime !== 'string' || !Number.isFinite(Date.parse(raw.startTime)) || !['inProgress', 'unstarted'].includes(raw.state) || !Array.isArray(raw.matchTeams) || raw.matchTeams.length !== 2) continue;
        const names = raw.matchTeams.map((t: unknown) => object(t)?.name);
        if (!names.every((name: unknown) => typeof name === 'string' && knownTeam(team(name)))) continue;
        const entry: Event = { id: raw.id, startTime: raw.startTime, state: raw.state, teams: names.map(team).sort(), streams: streams(raw.streams) };
        if (entry.teams[0] === entry.teams[1]) continue;
        const old = events.get(entry.id);
        if (old && JSON.stringify(old) !== JSON.stringify(entry)) conflicts.add(entry.id);
        events.set(entry.id, entry);
      } catch { /* Schema drift fails closed. */ }
    }
  }
  return [...events.values()].filter(event => !conflicts.has(event.id));
}

export function findLolMatchStreams(match: Candidate, events: Event[]): MatchStream[] {
  if (!['running', 'upcoming'].includes(match.status) || match.opponents.length !== 2 || !Number.isFinite(Date.parse(match.scheduledAt || match.beginAt))) return [];
  const names = match.opponents.map(t => team(t.name)).sort();
  if (!names.every(knownTeam) || names[0] === names[1]) return [];
  // Require the exact two full names and scheduled instant. An abbreviation or
  // changed start time is insufficient evidence, even when a match seems likely.
  const matches = events.filter(event => Date.parse(event.startTime) === Date.parse(match.scheduledAt || match.beginAt) && event.teams[0] === names[0] && event.teams[1] === names[1] && (match.status !== 'running' || event.state === 'inProgress'));
  return matches.length === 1 ? matches[0].streams : [];
}

// Reuse the parsed official snapshot across differing board/preview target sets.
let parsedSnapshot: { html: string; events: Event[]; expires: number } | undefined;
/** The caller owns network deadlines and caching; this source performs one read. */
export async function loadLolStreams(targets: StreamTarget[], read: ReadStreamPage): Promise<Record<number, MatchStream[]>> {
  const eligible = targets.filter(target => ['running', 'upcoming'].includes(target.status));
  if (!eligible.length) return {};
  try {
    const html = await read(LOL_SCHEDULE_URL);
    if (!html) return {};
    if (!parsedSnapshot || parsedSnapshot.expires <= Date.now() || parsedSnapshot.html !== html) parsedSnapshot = { html, events: parseLolSchedule(html), expires: Date.now() + 300_000 };
    const events = parsedSnapshot.events;
    const result: Record<number, MatchStream[]> = {};
    for (const target of eligible) {
      const found = findLolMatchStreams(target, events);
      if (found.length) result[target.id] = found;
    }
    return result;
  } catch { return {}; }
}
