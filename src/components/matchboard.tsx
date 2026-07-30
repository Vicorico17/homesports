"use client";

import { useEffect, useMemo, useState } from "react";
import type { Match, MatchStatus } from "@/lib/matches";

const tabs: { label: string; status: MatchStatus | "all" }[] = [{ label: "All matches", status: "all" }, { label: "Live", status: "running" }, { label: "Upcoming", status: "upcoming" }];
const popularLeagues = ["LCK", "LPL", "LEC", "LCS", "LFL", "Prime League 1st Division"];

function timeLabel(value: string, status: MatchStatus) {
  if (status === "running") return "LIVE NOW";
  const date = new Date(value);
  if (status === "finished") return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return date.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

function startsIn(value: string) {
  const minutes = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 60_000));
  if (minutes < 60) return `${minutes}M`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H ${minutes % 60}M`;
  return `${Math.floor(hours / 24)}D ${hours % 24}H`;
}

function StarRating({ value }: { value: number }) { return <span className={`stars stars-${value}`} aria-label={`${value} out of 5 importance stars`}>{"★".repeat(value)}<i>{"★".repeat(5 - value)}</i></span>; }

function LiveStreams({ matches }: { matches: Match[] }) {
  const live = matches.filter((match) => match.status === "running" && match.streams.length > 0);
  if (!live.length) return null;
  return <section className="live-streams"><span><b /> WATCH LIVE</span>{live.flatMap((match) => match.streams.map((stream) => <a href={stream.url} target="_blank" rel="noreferrer" key={`${match.id}-${stream.url}`}>{match.name} · {stream.language.toUpperCase()} ↗</a>))}</section>;
}

export function Matchboard({ matches, demo }: { matches: Match[]; demo: boolean }) {
  const [tab, setTab] = useState<MatchStatus | "all">("all");
  const [minimum, setMinimum] = useState(1);
  const [league, setLeague] = useState("all");
  const [showMoreLeagues, setShowMoreLeagues] = useState(false);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [picksLoaded, setPicksLoaded] = useState(false);
  const leagues = useMemo(() => [...new Set(matches.map((match) => match.league))].sort((a, b) => a.localeCompare(b)), [matches]);
  const liveLeagues = useMemo(() => new Set(matches.filter((match) => match.status === "running").map((match) => match.league)), [matches]);
  const priorityLeagues = useMemo(() => popularLeagues.filter((name) => leagues.includes(name)), [leagues]);
  const otherLeagues = useMemo(() => leagues.filter((name) => !popularLeagues.includes(name)), [leagues]);
  const list = useMemo(() => matches.filter((match) => (tab === "all" || match.status === tab) && (league === "all" || match.league === league) && match.importance >= minimum), [matches, tab, league, minimum]);
  useEffect(() => {
    if (demo) return;
    const refresh = window.setInterval(() => window.location.reload(), 60_000);
    return () => window.clearInterval(refresh);
  }, [demo]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("homesports-picks");
      if (saved) setPicks(JSON.parse(saved));
    } catch { /* Ignore unavailable or malformed browser storage. */ }
    setPicksLoaded(true);
  }, []);
  useEffect(() => {
    if (picksLoaded) window.localStorage.setItem("homesports-picks", JSON.stringify(picks));
  }, [picks, picksLoaded]);
  const savePick = (matchId: number, team: string) => setPicks((current) => ({ ...current, [matchId]: team }));
  const savedPicks = Object.keys(picks).length;
  return <div className="shell">
    <header><a className="brand" href="/"><span>HOME</span>SPORTS</a><p>League of Legends esports, ranked by what matters.</p><a className="calendar-link" href="/calendar">CALENDAR</a><div className="pick-count">PICK’EM <b>{savedPicks}</b></div><div className="pulse"><b /> LIVE DATA</div></header>
    <LiveStreams matches={matches} />
    {demo && <aside>Demo data is shown. Add <code>PANDASCORE_API_KEY</code> to <code>.env.local</code> to load the live worldwide schedule.</aside>}
    <section className="hero"><div><span className="eyebrow">MATCH INTELLIGENCE</span><h1>The games worth<br /><em>watching.</em></h1></div><p>Every LoL competition in one board. Our importance rating brings international clashes, playoffs, and top-tier series to the surface.</p></section>
    <nav className="filters" aria-label="Match filters"><div className="filter-left"><div className="match-tabs">{tabs.map((item) => <button className={tab === item.status ? "selected" : ""} onClick={() => setTab(item.status)} key={item.status}>{item.label}</button>)}</div><div className="league-filter"><span>LEAGUES</span><div className="league-chips"><button className={league === "all" ? "league-chip selected" : "league-chip"} onClick={() => setLeague("all")}>All{liveLeagues.size ? <i>{liveLeagues.size} live</i> : null}</button>{priorityLeagues.map((name) => <button className={league === name ? "league-chip selected" : "league-chip"} onClick={() => setLeague(name)} key={name}>{liveLeagues.has(name) && <b className="live-dot" />}{name}</button>)}{showMoreLeagues && otherLeagues.map((name) => <button className={league === name ? "league-chip selected" : "league-chip"} onClick={() => setLeague(name)} key={name}>{liveLeagues.has(name) && <b className="live-dot" />}{name}</button>)}{otherLeagues.length > 0 && <button className="more-leagues" onClick={() => setShowMoreLeagues((shown) => !shown)}>{showMoreLeagues ? "Less leagues −" : `More leagues +${otherLeagues.length}`}</button>}</div></div></div><label className="importance-filter">MIN. IMPORTANCE <select value={minimum} onChange={(event) => setMinimum(Number(event.target.value))}>{[1,2,3,4,5].map((star) => <option key={star} value={star}>{star} ★</option>)}</select></label></nav>
    <section className="board"><div className="board-heading"><h2>{tab === "running" ? "Live now" : tab === "upcoming" ? "Upcoming matches" : tab === "finished" ? "Recent results" : "The match board"}</h2><small>{list.length} matches · Updates every minute</small></div>{list.length ? <div className="cards">{list.map((match) => <article className={`match ${match.status}`} key={match.id}><div className="meta"><span className="status">{timeLabel(match.beginAt, match.status)}</span><span>{match.league} · BO{match.bestOf}</span></div><div className="teams">{match.opponents.slice(0, 2).map((team) => <div className="team" key={team.name}>{team.imageUrl ? <img src={team.imageUrl} alt="" /> : <span className="crest">{team.name.slice(0, 1)}</span>}<b>{team.name}</b>{match.status !== "upcoming" && <strong>{team.score ?? "—"}</strong>}</div>)}{match.status === "upcoming" && <div className="start-countdown">STARTS IN <b>{startsIn(match.beginAt)}</b></div>}</div><footer><span><StarRating value={match.importance} /> <small>{match.importanceReason}</small></span><span>{match.tournament || match.serie}</span></footer>{match.status === "upcoming" && match.opponents.length === 2 && <div className="pick-row"><span>PICK WINNER</span>{match.opponents.map((team) => <button className={picks[match.id] === team.name ? "picked" : ""} onClick={() => savePick(match.id, team.name)} key={team.name}>{team.name}</button>)}</div>}</article>)}</div> : <div className="empty">No matches meet this filter.</div>}</section>
  </div>;
}
