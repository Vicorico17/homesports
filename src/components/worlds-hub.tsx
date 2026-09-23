"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { track } from "@vercel/analytics";
import { FollowTeamButton } from "@/components/follow-team-button";
import type { Match, MatchFeed } from "@/lib/matches";
import { isWorlds2026Match, swissRecords, worldsStage, worldsStageOrder } from "@/lib/worlds";

const spoilerKey = "homesports:worlds-spoilers-hidden";
const spoilerEvent = "homesports:worlds-spoilers-changed";
let spoilerOverride: boolean | null = null;
const subscribeToClient = () => () => {};
const clientReady = () => true;
const serverNotReady = () => false;
const serverSpoilerPreference = () => true;
function clientSpoilerPreference() {
  if (spoilerOverride != null) return spoilerOverride;
  try { return window.localStorage.getItem(spoilerKey) !== "false"; } catch { return true; }
}
function subscribeToSpoilers(callback: () => void) {
  window.addEventListener(spoilerEvent, callback);
  const syncStorage = () => { spoilerOverride = null; callback(); };
  window.addEventListener("storage", syncStorage);
  return () => { window.removeEventListener(spoilerEvent, callback); window.removeEventListener("storage", syncStorage); };
}

function matchTime(value: string, local: boolean) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Time TBD";
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" };
  return new Intl.DateTimeFormat(undefined, local ? options : { ...options, timeZone: "UTC" }).format(new Date(value));
}

export function WorldsHub({ matches: initialMatches, updatedAt: initialUpdatedAt, sourceStatus: initialSourceStatus }: { matches: Match[]; updatedAt: string; sourceStatus: string }) {
  const [matches, setMatches] = useState(initialMatches);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [sourceStatus, setSourceStatus] = useState(initialSourceStatus);
  const hideSpoilers = useSyncExternalStore(subscribeToSpoilers, clientSpoilerPreference, serverSpoilerPreference);
  const localTime = useSyncExternalStore(subscribeToClient, clientReady, serverNotReady);
  useEffect(() => {
    const refresh = () => fetch("/api/matches").then(response => response.ok ? response.json() as Promise<MatchFeed> : null).then(feed => {
      if (!feed) return;
      setMatches(feed.demo ? [] : feed.matches.filter(isWorlds2026Match));
      setUpdatedAt(feed.updatedAt);
      setSourceStatus(feed.sourceStatus);
    }).catch(() => setSourceStatus("unavailable"));
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const records = useMemo(() => swissRecords(matches), [matches]);
  const stages = worldsStageOrder.map(name => ({ name, matches: matches.filter(match => worldsStage(match) === name) })).filter(stage => stage.matches.length);
  const next = matches.filter(match => match.status !== "finished").sort((a, b) => (Date.parse(a.beginAt) || Infinity) - (Date.parse(b.beginAt) || Infinity))[0];

  function toggleSpoilers() {
    const nextValue = !hideSpoilers;
    spoilerOverride = nextValue;
    try { window.localStorage.setItem(spoilerKey, String(nextValue)); } catch { /* Preference applies to this visit. */ }
    window.dispatchEvent(new Event(spoilerEvent));
    track("Worlds Spoiler Preference Changed", { hidden: nextValue });
  }

  return <main className="worlds-page">
    <nav className="worlds-topbar"><Link className="brand" href="/"><span>HOME</span>SPORTS</Link><Link href="/">Match board</Link><Link href="/calendar">Calendar</Link></nav>
    <header className="worlds-hero"><span className="eyebrow">LEAGUE OF LEGENDS WORLD CHAMPIONSHIP</span><h1>Worlds 2026</h1><p>Confirmed matches, stage progress, and official streams in one place. Times switch to your device timezone after the page loads.</p><div className="worlds-controls"><button type="button" onClick={toggleSpoilers} aria-pressed={hideSpoilers}>{hideSpoilers ? "Show results" : "Hide results"}</button><small>{sourceStatus === "healthy" ? `PandaScore feed · updated ${matchTime(updatedAt, localTime)}` : "Live source unavailable"}</small></div></header>
    {next && <section className="worlds-next"><span className="eyebrow">NEXT UP</span><strong>{next.opponents.length === 2 ? next.opponents.map(team => team.name).join(" vs ") : next.name || "Teams TBD"}</strong><span>{matchTime(next.beginAt, localTime)} · {next.tournament || "Worlds"}</span>{next.streams.find(stream => stream.official) && <a href={next.streams.find(stream => stream.official)!.url} target="_blank" rel="noopener noreferrer" onClick={() => track("Stream Opened", { matchId: next.id, league: next.league })}>Official stream ↗</a>}</section>}
    {!matches.length && <p className="worlds-empty">No verified Worlds 2026 fixtures are in the live feed yet. This page will fill in as the provider publishes matches; no pairings or start times are estimated.</p>}
    <section className="worlds-section"><h2>Follow the stages</h2><div className="worlds-stage-guide"><article><b>01 · Play-in</b><p>Opening fixtures appear here when published by the data provider.</p></article><article><b>02 · Swiss</b><p>Confirmed results build a record table. Future draws remain unfilled.</p></article><article><b>03 · Knockout</b><p>Published matchups and source-backed bracket links appear here.</p></article></div></section>
    {records.length > 0 && <section className="worlds-section"><h2>Swiss records</h2><p>Calculated from completed Swiss matches with confirmed series scores. Future draws and qualification are not projected.</p>{hideSpoilers ? <p>Reveal results to see the Swiss table.</p> : <div className="worlds-records">{records.map(row => <div key={row.id ?? row.name}><span>{row.id != null ? <Link href={`/teams/${row.id}`}>{row.name}</Link> : row.name}</span><b>{row.wins}–{row.losses}</b></div>)}</div>}</section>}
    {stages.map(stage => <section className="worlds-section" key={stage.name}><h2>{stage.name === "Other" ? "Additional fixtures" : stage.name}</h2><div className="worlds-match-list">{stage.matches.map(match => <article key={match.id}><div><span className="worlds-status">{match.status === "running" ? "LIVE" : match.status === "finished" ? "FINAL" : "SCHEDULED"}</span><time dateTime={match.beginAt || undefined}>{matchTime(match.beginAt, localTime)}</time><Link href={`/competition/${match.tournamentId}`}>{match.tournament || "Worlds"}</Link></div><div className="worlds-match-teams">{match.opponents.length === 2 ? match.opponents.map(team => <div key={team.id ?? team.name}><span>{team.id != null ? <Link href={`/teams/${team.id}`}>{team.name}</Link> : team.name}</span><b>{hideSpoilers || match.status === "upcoming" ? "" : team.score ?? "—"}</b>{team.id != null && <FollowTeamButton teamId={String(team.id)} teamName={team.name} />}</div>) : <span>Teams to be announced</span>}</div><div className="worlds-match-actions">{match.streams.find(stream => stream.official) && <a href={match.streams.find(stream => stream.official)!.url} target="_blank" rel="noopener noreferrer" onClick={() => track("Stream Opened", { matchId: match.id, league: match.league })}>Watch official stream ↗</a>}{stage.name === "Knockout" && match.hasBracket && <Link href={`/bracket/${match.tournamentId}`}>View bracket →</Link>}</div></article>)}</div></section>)}
  </main>;
}
