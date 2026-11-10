import { directStreamUrl, type MatchStream } from "./streams.ts";

export type StreamTarget = { id: number; status: string; beginAt: string; scheduledAt?: string; league: string; serie: string; opponents: { name: string }[] };
export type ReadStreamPage = (url: string) => Promise<string | null>;
const origin = "https://www.vlr.gg";

function decode(value: string) {
  return value.replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
    const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
  }).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&ndash;|&mdash;/g, "-");
}
function text(value: string) { return decode(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim(); }
function normalized(value: string) { return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""); }
function attr(value: string, name: string) { return decode(new RegExp(`\\b${name}=["']([^"']*)["']`, "i").exec(value)?.[1] ?? ""); }
function anchors(html: string) { return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(([, attributes, body]) => ({ attributes, body, href: attr(attributes, "href") })); }
function teamPair(names: string[]) { const values = names.map(normalized).sort(); return values.length === 2 && values.every(value => value && !/^(tbd|tba|unknown|tobedetermined)$/.test(value)) && values[0] !== values[1] ? values.join("|") : null; }
function competitionTokens(value: string) {
  return value.toLowerCase().replace(/asia pacific/g, "").replace(/[^a-z\d]+/g, " ").trim().split(/\s+/).filter(Boolean);
}
function sameCompetition(match: StreamTarget, value: string) {
  const source = new Set(competitionTokens(value));
  const required = [...new Set(competitionTokens(`${match.league} ${match.serie}`))];
  return required.length >= 2 && required.every(token => source.has(token));
}

/** Discovery only. A candidate URL cannot become a stream without checking its match page. */
export function vlrMatchCandidates(html: string, match: StreamTarget): string[] {
  const target = teamPair(match.opponents.map(team => team.name));
  if (!target) return [];
  return [...new Set(anchors(html).filter(anchor => /^\/\d+\/[a-z\d-]+\/?$/i.test(anchor.href)).filter(anchor => {
    const names = [...anchor.body.matchAll(/class="[^"]*match-item-vs-team-name[^"\n]*"[^>]*>([\s\S]*?)<\/div>/g)].map(([, body]) => text(body));
    if (teamPair(names) === target) return true;
    // Event brackets expose each opponent in a bracket-item-team-name element.
    const bracketNames = [...anchor.body.matchAll(/class="[^"]*bracket-item-team-name[^"\n]*"[^>]*>([\s\S]*?)<\/div>/g)].map(([, body]) => text(body));
    if (teamPair(bracketNames) === target) return true;
    const label = text(anchor.body);
    return match.opponents.every(team => label.toLowerCase().includes(team.name.toLowerCase()));
  }).map(anchor => origin + anchor.href))];
}

export function vlrEventCandidates(html: string, matches: StreamTarget[]) {
  return [...new Set(anchors(html).filter(anchor => /^\/event\/\d+\/[a-z\d-]+\/?$/i.test(anchor.href) && /\bevent-item\b/.test(attr(anchor.attributes, "class"))).filter(anchor => {
    const name = /class="event-item-title"[^>]*>([\s\S]*?)<\/div>/.exec(anchor.body)?.[1];
    return name && matches.some(match => sameCompetition(match, text(name)));
  }).map(anchor => origin + anchor.href))].slice(0, 3);
}

export function verifyVlrMatch(match: StreamTarget, html: string, sourceUrl: string): boolean {
  if (!/^https:\/\/www\.vlr\.gg\/\d+\/[a-z\d-]+\/?$/i.test(sourceUrl)) return false;
  if (!["running", "upcoming"].includes(match.status)) return false;
  const header = html.split('class="wf-card  match-header"')[1]?.split('class="sm-pane sm-pane-streams"')[0] ?? "";
  const teams = anchors(header).filter(anchor => /\bmatch-header-link\b/.test(attr(anchor.attributes, "class"))).map(anchor => text(/class="wf-title-med[^"\n]*"[^>]*>([\s\S]*?)<\/div>/.exec(anchor.body)?.[1] ?? ""));
  if (!teamPair(teams) || teamPair(teams) !== teamPair(match.opponents.map(team => team.name))) return false;
  const event = anchors(header).find(anchor => /\bmatch-header-event\b/.test(attr(anchor.attributes, "class")));
  if (!event || !sameCompetition(match, text(event.body))) return false;
  const rawDate = /data-utc-ts="(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})"/.exec(header)?.[1];
  const sourceTime = rawDate ? Date.parse(rawDate.replace(" ", "T") + "Z") : NaN;
  const targetTime = Date.parse(match.scheduledAt || match.beginAt);
  if (!Number.isFinite(sourceTime) || !Number.isFinite(targetTime) || Math.abs(sourceTime - targetTime) > 60_000) return false;
  if (match.status === "running" && !/class="[^"]*match-header-vs-note[^"]*mod-live[^"]*"[^>]*>\s*live/i.test(header)) return false;
  if (/match-header-vs-note[^>]*>\s*(?:final|finished|canceled|cancelled)/i.test(header)) return false;
  return true;
}

export function matchingVlrStreams(match: StreamTarget, html: string, sourceUrl: string): MatchStream[] {
  if (!verifyVlrMatch(match, html, sourceUrl)) return [];
  // Scope strictly to Streams, excluding VODs, advertisements, comments and other games.
  const pane = html.split('class="sm-pane sm-pane-streams"')[1]?.split('class="sm-pane sm-pane-vods"')[0] ?? "";
  const blocks = pane.split(/(?=<div class="sm-btn\b)/);
  const streams: MatchStream[] = [];
  for (const block of blocks) {
    const opening = /^<div\b([^>]*)>/.exec(block)?.[1];
    if (!opening || /offline/i.test(opening) || !["broadcast", "watchparty"].includes(attr(opening, "data-type"))) continue;
    for (const anchor of anchors(block)) {
      if (!/\bsm-ext\b/.test(attr(anchor.attributes, "class"))) continue;
      const url = directStreamUrl(anchor.href);
      if (url && !streams.some(stream => stream.url === url)) streams.push({ url, official: attr(opening, "data-type") === "broadcast", language: "und", source: "VLR.gg", sourceUrl });
    }
  }
  return streams.sort((a, b) => Number(b.official) - Number(a.official));
}

/** One index, at most three event pages and eight match pages. Caller owns cache/time/request budget. */
export async function loadVlrStreams(matches: StreamTarget[], read: ReadStreamPage): Promise<Record<number, MatchStream[]>> {
  if (!matches.length) return {};
  const [index, events] = await Promise.all([read(`${origin}/matches/`), read(`${origin}/events/`)]);
  const eventPages = await Promise.all(vlrEventCandidates(events ?? "", matches).map(url => read(url)));
  const pages = [index ?? "", ...eventPages.map(page => page ?? "")];
  const candidates = matches.map(match => ({ match, urls: [...new Set(pages.flatMap(page => vlrMatchCandidates(page, match)))] }));
  const urls = [...new Set(candidates.flatMap(candidate => candidate.urls))].slice(0, 8);
  const detailPages = new Map(await Promise.all(urls.map(async url => [url, await read(url)] as const)));
  const found: Record<number, MatchStream[]> = {};
  for (const { match, urls: matchUrls } of candidates) {
    // Unread candidates do not establish uniqueness. An empty stream list still
    // counts as a matching fixture, so it cannot be replaced by another match.
    if (matchUrls.some(url => !detailPages.get(url))) continue;
    const verified = matchUrls.filter(url => verifyVlrMatch(match, detailPages.get(url)!, url));
    if (verified.length === 1) {
      const streams = matchingVlrStreams(match, detailPages.get(verified[0])!, verified[0]);
      if (streams.length) found[match.id] = streams;
    }
  }
  return found;
}
