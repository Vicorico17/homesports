"use client";

import Link from "next/link";
import { MatchPreviewLink } from "@/components/match-preview-link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { track } from "@vercel/analytics";
import { WorldsTeam } from "@/components/worlds-team";
import { FollowTeamButton } from "@/components/follow-team-button";
import { PlayoffBracket } from "@/components/playoff-bracket";
import type { Match } from "@/lib/matches";
import { groupSwissRecords, swissMatchGroups, worldsStage, worldsStageOrder, type WorldsData } from "@/lib/worlds";

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

export function WorldsHub({ matches: initialMatches, brackets: initialBrackets, updatedAt: initialUpdatedAt, sourceStatus: initialSourceStatus }: { matches: Match[]; brackets: WorldsData["brackets"]; updatedAt: string; sourceStatus: string }) {
  const [matches, setMatches] = useState(initialMatches);
  const [brackets, setBrackets] = useState(initialBrackets);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [sourceStatus, setSourceStatus] = useState(initialSourceStatus);
  const hideSpoilers = useSyncExternalStore(subscribeToSpoilers, clientSpoilerPreference, serverSpoilerPreference);
  const localTime = useSyncExternalStore(subscribeToClient, clientReady, serverNotReady);
  useEffect(() => {
    const refresh = () => fetch("/api/worlds").then(response => response.ok ? response.json() as Promise<WorldsData> : null).then(feed => {
      if (!feed) return;
      setMatches(feed.matches);
      setBrackets(feed.brackets);
      setUpdatedAt(feed.updatedAt);
      setSourceStatus(feed.sourceStatus);
    }).catch(() => setSourceStatus("unavailable"));
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const recordGroups = useMemo(() => groupSwissRecords(matches), [matches]);
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
    {next && <section className="worlds-next match-preview-card"><span className="eyebrow">NEXT UP</span><MatchPreviewLink id={next.id} name={next.name} /><strong className="worlds-next-matchup">{next.opponents.length === 2 ? <><WorldsTeam team={next.opponents[0]} /><span className="worlds-versus">vs</span><WorldsTeam team={next.opponents[1]} /></> : next.name || "Teams TBD"}</strong><span>{matchTime(next.beginAt, localTime)} · {next.tournament || "Worlds"}</span>{next.streams.find(stream => stream.official) && <a href={next.streams.find(stream => stream.official)!.url} target="_blank" rel="noopener noreferrer" onClick={() => track("Stream Opened", { matchId: next.id, league: next.league })}>Official stream ↗</a>}</section>}
    {!matches.length && <p className="worlds-empty">No verified Worlds 2026 fixtures are in the live feed yet. This page will fill in as the provider publishes matches; no pairings or start times are estimated.</p>}
    <section className="worlds-section"><h2>Follow the stages</h2><div className="worlds-stage-guide"><article><b>01 · Play-in</b><p>Follow the opening bracket and select a match for team previews.</p></article><article><b>02 · Swiss</b><p>Confirmed results build a record table. Future draws remain unfilled.</p></article><article><b>03 · Knockout</b><p>Published matchups and source-backed bracket links appear here.</p></article></div></section>
    {recordGroups.length > 0 && <section className="worlds-section"><h2>Swiss records</h2><p>Calculated from completed Swiss matches with confirmed series scores. Future draws and qualification are not projected.</p>{hideSpoilers ? <p>Reveal results to see the Swiss table.</p> : <div>{recordGroups.map(group => <section className="worlds-record-group" key={group.label}><h3>{group.label}</h3><div className="worlds-records">{group.teams.map(row => <div key={row.id ?? row.name}><WorldsTeam team={row} /></div>)}</div></section>)}</div>}</section>}
    {stages.map(stage => <section className="worlds-section" key={stage.name}><h2>{stage.name === "Other" ? "Additional fixtures" : stage.name}</h2>{stage.name === "Play-in" ? <div className="worlds-hub-playin">{brackets.some(bracket => bracket.stage === "Play-in" && bracket.available) ? brackets.filter(bracket => bracket.stage === "Play-in" && bracket.available).map(bracket => <PlayoffBracket key={bracket.tournamentId} matches={bracket.matches} hideScores={hideSpoilers} matchPreviews />) : <p className="worlds-bracket-pending">The Play-In bracket will appear when the provider publishes it.</p>}</div> : <div className="worlds-match-list">{(stage.name === "Swiss" ? swissMatchGroups(stage.matches) : [{ label: "", matches: stage.matches }]).map(group => <div className="worlds-record-match-group" key={group.label || stage.name}>{stage.name === "Swiss" && <h3>{group.label} record</h3>}{group.matches.map(match => <article className="match-preview-card" key={match.id}><div><span className="worlds-status">{match.status === "running" ? "LIVE" : match.status === "finished" ? "FINAL" : "SCHEDULED"}</span><time dateTime={match.beginAt || undefined}>{matchTime(match.beginAt, localTime)}</time><Link href={`/competition/${match.tournamentId}`}>{match.tournament || "Worlds"}</Link></div><div className="worlds-match-teams">{match.opponents.length === 2 ? match.opponents.map(team => <div key={team.id ?? team.name}><WorldsTeam team={team} /><b>{hideSpoilers || match.status === "upcoming" ? "" : team.score ?? "—"}</b>{team.id != null && <FollowTeamButton teamId={String(team.id)} teamName={team.name} />}</div>) : <span>Teams to be announced</span>}</div><div className="worlds-match-actions"><MatchPreviewLink id={match.id} name={match.name} />{match.streams.find(stream => stream.official) && <a href={match.streams.find(stream => stream.official)!.url} target="_blank" rel="noopener noreferrer" onClick={() => track("Stream Opened", { matchId: match.id, league: match.league })}>Watch official stream ↗</a>}{stage.name === "Knockout" && match.hasBracket && <Link href={`/bracket/${match.tournamentId}`}>View bracket →</Link>}</div></article>)}</div>)}</div>}</section>)}
  </main>;
}
