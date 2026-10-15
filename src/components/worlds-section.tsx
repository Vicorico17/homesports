"use client";

import Link from "next/link";
import { MatchPreviewLink } from "@/components/match-preview-link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { track } from "@vercel/analytics";
import { WorldsTeam } from "@/components/worlds-team";
import { PlayoffBracket } from "@/components/playoff-bracket";
import { filterWorldsMatches, groupWorldsMatches, swissRecords, worldsStage, type WorldsData, type WorldsStage } from "@/lib/worlds";
import type { Match } from "@/lib/matches";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const stages: { id: WorldsStage; name: string; description: string; number: string }[] = [
  { id: "Play-in", name: "Play-In", description: "The opening bracket", number: "01" },
  { id: "Swiss", name: "Swiss stage", description: "Match groups & records", number: "02" },
  { id: "Knockout", name: "Knockouts", description: "The road to the final", number: "03" },
];

function displayTime(value: string, local: boolean) {
  if (!Number.isFinite(Date.parse(value))) return "Time to be announced";
  return new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short", ...(local ? {} : { timeZone: "UTC" }) }).format(new Date(value));
}
function groupTitle(label: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(label) ? new Intl.DateTimeFormat("en-GB", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${label}T00:00:00Z`)) : label;
}

export function WorldsSection({ initialData, filters }: { initialData: WorldsData; filters: { league: string; minimum: number; query: string } }) {
  const [data, setData] = useState(initialData);
  const [selection, setSelection] = useState<WorldsStage | null>(null);
  const [showResults, setShowResults] = useState(false);
  const local = useSyncExternalStore(subscribe, clientReady, serverReady);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/worlds", { signal: controller.signal });
        if (!response.ok) throw Error("Worlds refresh failed");
        const next: WorldsData = await response.json();
        if (!Array.isArray(next.matches) || !Array.isArray(next.brackets)) throw Error("Invalid Worlds feed");
        setData(previous => next.sourceStatus === "healthy" ? next : { ...previous, sourceStatus: next.sourceStatus, complete: false });
      } catch {
        if (!controller.signal.aborted) setData(previous => ({ ...previous, sourceStatus: "unavailable", complete: false }));
      }
    };
    const timer = window.setInterval(refresh, 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  const matches = useMemo(() => filterWorldsMatches(data.matches, filters), [data.matches, filters]);
  const next = [...data.matches].filter(match => match.status !== "finished").sort((a, b) => Number(b.status === "running") - Number(a.status === "running") || (Date.parse(a.beginAt) || Infinity) - (Date.parse(b.beginAt) || Infinity))[0];
  const selected = selection ?? (next ? worldsStage(next) : "Play-in");
  const stageMatches = matches.filter(match => worldsStage(match) === selected);
  const groups = groupWorldsMatches(stageMatches);
  const records = swissRecords(data.matches);
  const brackets = data.brackets.filter(bracket => bracket.stage === selected);
  const availableStages = data.matches.some(match => worldsStage(match) === "Other") ? [...stages, { id: "Other" as const, name: "More fixtures", description: "Published schedule", number: "04" }] : stages;
  const hasFilters = filters.league !== "all" || filters.minimum > 1 || Boolean(filters.query.trim());
  const activeGroup = groups.find(group => group.matches.some(match => match.status !== "finished"))?.label ?? groups.at(-1)?.label;

  return <section className="worlds-spotlight" aria-labelledby="worlds-spotlight-title">
    <div className="worlds-spotlight-art"><img src="/worlds/worlds-2026.jpg" width={1920} height={1080} alt="Official Worlds 2026 artwork and Worlds 26 logo — This Is Our Moment" /></div>
    <div className="worlds-spotlight-heading"><div><p className="eyebrow">LEAGUE OF LEGENDS WORLD CHAMPIONSHIP</p><h2 id="worlds-spotlight-title">Worlds <span>2026</span></h2><p>Every published series. Every stage. One place to follow it.</p></div><Link href="/worlds">Open Worlds hub ↗</Link></div>
    <div className="worlds-spotlight-summary"><span><b>{data.matches.length}</b> published matches</span><span><b>{data.matches.filter(match => match.status === "running").length}</b> live now</span><span>{data.sourceStatus === "healthy" ? "Updated" : "Last available update"} {displayTime(data.updatedAt, local)}</span></div>
    {(!data.complete || data.sourceStatus !== "healthy") && <p className="worlds-spotlight-notice" role="status">{data.matches.length ? "Showing the available schedule. Some Worlds data could not be refreshed." : "The Worlds schedule is not available from the live provider yet. Fixtures will appear here when published."}</p>}
    {next && !hasFilters && <div className="worlds-spotlight-next match-preview-card"><span>{next.status === "running" ? "● LIVE NOW" : "NEXT SERIES"}</span><strong className="worlds-next-matchup">{next.opponents.length === 2 ? <><WorldsTeam team={next.opponents[0]} /><span className="worlds-versus">vs</span><WorldsTeam team={next.opponents[1]} /></> : "Teams to be announced"}</strong><time dateTime={next.beginAt || undefined}>{displayTime(next.beginAt, local)}</time><MatchPreviewLink id={next.id} name={next.name} /></div>}
    <div className="worlds-spotlight-stages" role="group" aria-label="Worlds stages">{availableStages.map(stage => <button key={stage.id} aria-pressed={selected === stage.id} onClick={() => setSelection(stage.id)}><span>{stage.number}</span><div><strong>{stage.name}</strong><small>{stage.description}</small></div><b>{matches.filter(match => worldsStage(match) === stage.id).length}</b></button>)}</div>
    <div className="worlds-spotlight-body"><div className="worlds-spotlight-tools"><p>{selected === "Swiss" ? "Swiss matches are grouped by published round or matchday. Date groups use UTC." : selected === "Play-in" ? "Follow the Play-In bracket. Select a match to see the teams and win chances." : "Follow published series and the bracket as matchups are confirmed."}</p><button aria-pressed={showResults} onClick={() => setShowResults(value => !value)}>{showResults ? "Hide scores" : "Show scores"}</button></div>
      {selected === "Swiss" && records.length > 0 && <details className="worlds-swiss-table"><summary>Swiss records <span>{records.length} teams</span></summary>{showResults ? <><p>Calculated from the completed matches currently loaded.</p><table><thead><tr><th scope="col">Team</th><th scope="col">Wins</th><th scope="col">Losses</th></tr></thead><tbody>{records.map(row => <tr key={row.id ?? row.name}><th scope="row"><WorldsTeam team={row} /></th><td>{row.wins}</td><td>{row.losses}</td></tr>)}</tbody></table></> : <p>Use Show scores to reveal Swiss records.</p>}</details>}
      {(selected === "Play-in" || selected === "Knockout") && <div className={`worlds-inline-brackets${selected === "Play-in" ? " worlds-bracket-only" : ""}`}><div className="worlds-inline-bracket-title"><h3>{selected === "Play-in" ? "Play-In bracket" : "Championship bracket"}</h3><span>Confirmed matchups · Unannounced teams stay TBD</span></div>{hasFilters && <p className="worlds-spotlight-notice">{selected === "Play-in" ? "The bracket shows the full Play-In stage, independent of match-list filters." : "The bracket shows the full stage. Your filters apply to the match list below."}</p>}{brackets.some(bracket => bracket.available) ? brackets.filter(bracket => bracket.available).map(bracket => <div key={bracket.tournamentId}><PlayoffBracket matches={bracket.matches} hideScores={!showResults} matchPreviews /><Link className="worlds-full-bracket" href={`/bracket/${bracket.tournamentId}`}>Open full bracket ↗</Link></div>) : <div className="worlds-bracket-pending"><strong>Bracket awaiting publication</strong><p>{selected === "Play-in" ? "The Play-In bracket will appear when the provider publishes it." : "Published matches are listed below. Connections and future pairings will appear when the provider supplies the bracket."}</p></div>}</div>}
      {selected !== "Play-in" && <><div className="worlds-spotlight-list-heading"><h3>{selected === "Swiss" ? "Swiss match groups" : "Stage matches"}</h3><span>{stageMatches.length} matches{hasFilters ? " matching your filters" : ""}</span></div>
      {!stageMatches.length ? <p className="worlds-bracket-pending">{hasFilters ? "No matches in this stage meet your filters." : "No matches have been published for this stage yet."}</p> : groups.map(group => <details className="worlds-match-group" key={`${selected}:${group.label}`} open={group.label === activeGroup}><summary><span>{groupTitle(group.label)}</span><small>{group.matches.length} series{group.matches.some(match => match.status === "running") ? " · LIVE" : ""}</small></summary><div className="worlds-spotlight-cards">{group.matches.map(match => <WorldsMatchCard key={match.id} match={match} showResults={showResults} local={local} />)}</div></details>)}</>}
    </div>
  </section>;
}

function WorldsMatchCard({ match, showResults, local }: { match: Match; showResults: boolean; local: boolean }) {
  const stream = match.streams.find(item => item.official);
  return <article className={`worlds-fixture match-preview-card ${match.status}`}><div className="worlds-fixture-meta"><span>{match.status === "running" ? "● LIVE" : match.status === "finished" ? "FINISHED" : "UPCOMING"}</span><span>BO{match.bestOf}</span></div><time dateTime={match.beginAt || undefined}>{displayTime(match.beginAt, local)}</time><div className="worlds-fixture-teams">{[0, 1].map(index => { const team = match.opponents[index]; return <div key={index}>{team?.imageUrl ? <img src={team.imageUrl} alt="" width={28} height={28} /> : <span className="worlds-team-placeholder" aria-hidden="true">{team?.name.slice(0, 1) ?? "?"}</span>}{team?.id ? <Link href={`/teams/${team.id}`}>{team.name}</Link> : <span>{team?.name ?? "To be announced"}</span>}<b>{match.status !== "upcoming" && showResults ? team?.score ?? "—" : "—"}</b></div>; })}</div><div className="worlds-fixture-actions"><MatchPreviewLink id={match.id} name={match.name} /><Link href={`/competition/${match.tournamentId}`}>Stage details →</Link>{stream && match.status !== "finished" && <a href={stream.url} target="_blank" rel="noopener noreferrer" onClick={() => track("Stream Opened", { matchId: match.id, league: match.league })}>{match.status === "running" ? "Watch live ↗" : "Official stream ↗"}</a>}</div></article>;
}
