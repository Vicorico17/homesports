/** Only stream locations published on this exact match may be used here.
 * Never infer a channel from a team, league, game, or another match.
 */
export type MatchStream = { url: string; language: string; official: boolean; main?: boolean; source?: "PandaScore" | "VLR.gg" | "LoL Esports"; sourceUrl?: string };
export type PandaStreamFields = {
  streams_list?: unknown;
  // Older provider responses can expose these match-specific fields instead.
  streams?: unknown;
  official_stream_url?: unknown;
};

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

/** Convert only known player/channel forms to direct viewing pages, never search or redirect URLs. */
export function directStreamUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) return null;
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");
  if (["twitch.tv", "www.twitch.tv", "m.twitch.tv", "player.twitch.tv"].includes(host)) {
    const channel = host === "player.twitch.tv" ? url.searchParams.get("channel") : path.slice(1);
    if (!channel || !/^[a-z\d_]{1,25}$/i.test(channel) || /^(directory|downloads|jobs|p|search|settings|subscriptions|turbo|videos)$/i.test(channel)) return null;
    return `https://www.twitch.tv/${channel.toLowerCase()}`;
  }
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"].includes(host)) {
    const video = host === "youtu.be" ? path.slice(1) : path === "/watch" ? url.searchParams.get("v") : /^\/(?:embed|live)\/([^/]+)$/.exec(path)?.[1];
    if (video != null) return /^[a-z\d_-]{11}$/i.test(video) ? `https://www.youtube.com/watch?v=${video}` : null;
    // A match-linked channel's /live page is its direct broadcast entry point.
    const channel = /^(\/@[^/]+|\/channel\/[a-z\d_-]+|\/(?:c|user)\/[^/]+)(?:\/(?:live|streams))?$/i.exec(path)?.[1];
    const legacyChannel = /^\/(?!watch$|results$|feed$|playlist$|embed$|live$)([a-z\d_-]+)\/live$/i.exec(path)?.[1];
    if (channel) return `https://www.youtube.com${channel}/live`;
    if (legacyChannel) return `https://www.youtube.com/${legacyChannel}/live`;
    return null;
  }
  const channels: Record<string, RegExp> = {
    "live.bilibili.com": /^\/\d+$/,
    "www.huya.com": /^\/[a-z\d_-]+$/i,
    "huya.com": /^\/[a-z\d_-]+$/i,
    "www.douyu.com": /^\/[a-z\d_-]+$/i,
    "douyu.com": /^\/[a-z\d_-]+$/i,
    "www.sooplive.com": /^\/[a-z\d_-]+$/i,
    "sooplive.com": /^\/[a-z\d_-]+$/i,
    "play.sooplive.co.kr": /^\/[a-z\d_-]+(?:\/\d+)?$/i,
    "play.afreecatv.com": /^\/[a-z\d_-]+(?:\/\d+)?$/i,
    "kick.com": /^\/(?!categories$|search$|browse$)[a-z\d_-]+$/i,
    "www.kick.com": /^\/(?!categories$|search$|browse$)[a-z\d_-]+$/i,
    "www.facebook.com": /^\/(?:[^/]+\/videos\/\d+|watch\/live)\/?$/i,
    "facebook.com": /^\/[^/]+\/videos\/\d+$/i,
  };
  if (!channels[host]?.test(path) || /^\/(?:search|category|categories|directory|about|download|downloads|privacy|settings|login)$/i.test(path)) return null;
  if (host === "www.facebook.com" && path === "/watch/live") {
    const video = url.searchParams.get("v");
    return video && /^\d+$/.test(video) ? `https://www.facebook.com/watch/live/?v=${video}` : null;
  }
  return `https://${host}${path}`;
}

function normalizeStream(value: unknown, defaults: Partial<MatchStream> = {}): MatchStream | null {
  const stream = record(value);
  if (!stream) return null;
  const url = directStreamUrl(stream.raw_url) ?? directStreamUrl(stream.embed_url);
  if (!url) return null;
  const language = typeof stream.language === "string" && /^[a-z]{2,3}(?:[-_][a-z]{2,4})?$/i.test(stream.language.trim()) ? stream.language.trim().toLowerCase().replace("_", "-") : defaults.language ?? "und";
  return { url, language, official: stream.official === true || defaults.official === true, main: stream.main === true || defaults.main === true, source: "PandaScore" };
}

export function normalizeMatchStreams(match: PandaStreamFields): MatchStream[] {
  let candidates = (Array.isArray(match.streams_list) ? match.streams_list : []).flatMap(value => {
    const stream = normalizeStream(value);
    return stream ? [stream] : [];
  });
  // Do not revive deprecated URLs when the current match stream list is usable.
  if (!candidates.length) {
    const legacy = record(match.streams);
    candidates = [
      normalizeStream(legacy?.official, { official: true, main: true }),
      normalizeStream(legacy?.english, { language: "en" }),
      normalizeStream(legacy?.russian, { language: "ru" }),
      normalizeStream({ raw_url: match.official_stream_url }, { official: true, main: true }),
    ].filter((value): value is MatchStream => value != null);
  }
  const unique = new Map<string, MatchStream>();
  for (const stream of candidates) {
    const existing = unique.get(stream.url);
    unique.set(stream.url, existing ? { ...existing, language: existing.language === "und" ? stream.language : existing.language, official: existing.official || stream.official, main: existing.main || stream.main } : stream);
  }
  return [...unique.values()].sort((a, b) => Number(b.official) - Number(a.official) || Number(b.main) - Number(a.main) || Number(b.language === "en") - Number(a.language === "en"));
}

export function streamPlatform(url: string) {
  const host = new URL(url).hostname;
  if (host.endsWith("twitch.tv")) return "Twitch";
  if (host.endsWith("youtube.com")) return "YouTube";
  if (host.endsWith("bilibili.com")) return "Bilibili";
  if (host.endsWith("huya.com")) return "Huya";
  if (host.endsWith("douyu.com")) return "Douyu";
  if (/sooplive|afreecatv/.test(host)) return "SOOP";
  if (host.endsWith("kick.com")) return "Kick";
  if (host.endsWith("facebook.com")) return "Facebook";
  return "Stream";
}

export function streamAvailability(status: string, streams: MatchStream[]) {
  if (status === "finished") return { label: "Live coverage ended", available: false };
  if (!["running", "upcoming", "not_started"].includes(status)) return { label: "Stream unavailable", available: false };
  return streams.length ? { label: status === "running" ? "Watch live" : "Open stream", available: true } : { label: status === "running" ? "No verified stream available" : "Stream not announced", available: false };
}
