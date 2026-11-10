"use client";

import { track } from "@vercel/analytics";
import { directStreamUrl, streamAvailability, streamPlatform, type MatchStream } from "@/lib/streams";

type Props = { streams: MatchStream[]; status: string; matchId: number; matchName: string; league?: string; compact?: boolean };

/** Shared by both games. Provider-listed links are not proof that a channel is currently online. */
export function MatchStreamLinks({ streams, status, matchId, matchName, league, compact = false }: Props) {
  // A published channel is not this match’s live coverage before/after the series.
  if (status !== "running") return null;
  // Also validate cached/older normalized feeds at the rendering boundary.
  const safeStreams = streams.flatMap(stream => {
    const url = directStreamUrl(stream.url);
    return url ? [{ ...stream, url }] : [];
  });
  const availability = streamAvailability(status, safeStreams);
  if (!availability.available) return <span className="match-stream-unavailable" title="No reliable stream link has been published for this match in our sources.">{availability.label}</span>;
  const [primary, ...alternatives] = safeStreams;
  function link(stream: MatchStream, first = false) {
    const description = `${streamPlatform(stream.url)}${stream.language !== "und" && stream.language !== "stream" ? ` · ${stream.language.toUpperCase()}` : ""}`;
    return <a key={stream.url} href={stream.url} target="_blank" rel="noopener noreferrer" className={first ? "match-stream-primary" : undefined} aria-label={`${first ? availability.label : "Open stream"}: ${matchName}, ${description}`} title={`Listed for this match by ${stream.source ?? "PandaScore"}${stream.official ? " · Official broadcast" : ""}`} onClick={() => track("Stream Opened", { matchId, league: league ?? "", platform: streamPlatform(stream.url) })}>{first ? `${availability.label} · ` : ""}{description}{!compact && stream.official ? " · Official" : ""} ↗</a>;
  }
  return <div className={`match-stream-links${compact ? " compact" : ""}`}>
    {link(primary, true)}
    {alternatives.length > 0 && <details className="match-stream-alternatives"><summary>{alternatives.length} more {alternatives.length === 1 ? "stream" : "streams"}</summary><div>{alternatives.map(stream => link(stream))}</div></details>}
  </div>;
}
