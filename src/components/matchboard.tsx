"use client";

import { MatchStreamLinks } from "@/components/match-stream-links";

import { startsIn, timeLabel, updatedTimeLabel } from "@/lib/matchboard-time";
import { mergeMatchFeed, shouldPollMatchFeed } from "@/lib/client-match-feed";
import { startClientPolling } from "@/lib/client-polling";
import { useEffect, useMemo, useState } from "react";
import type { MatchFeed, MatchStatus } from "@/lib/matches";
import { track } from "@vercel/analytics";
import Link from "next/link";
import { LiveBadge } from "@/components/live-badge";
import { MatchPreviewLink } from "@/components/match-preview-link";
import { WorldsSection } from "@/components/worlds-section";
import { isWorlds2026Match, type WorldsData } from "@/lib/worlds";
import { gameName, gamePath } from "@/lib/game";

type BoardView = MatchStatus | "all";
const tabs: { label: string; status: BoardView }[] = [
  { label: "All matches", status: "all" },
  { label: "Live", status: "running" },
  { label: "Upcoming", status: "upcoming" },
];
const popularLeagues = ["LCK", "LPL", "LEC", "LCS", "LFL", "Prime League 1st Division"];

function StarRating({ value }: { value: number }) {
  return <span className={`stars stars-${value}`} aria-label={`${value} out of 5 importance stars`}>{"★".repeat(value)}<i>{"★".repeat(5 - value)}</i></span>;
}

export function Matchboard({ matches: initialMatches, demo, source, sourceStatus, updatedAt, game, worlds, view = "all" }: MatchFeed & { worlds?: WorldsData; view?: MatchStatus | "all" }) {
  const prefix = gamePath(game);
  const [now, setNow] = useState<number | null>(null);
  const localTime = now !== null;
  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const initial = window.setTimeout(updateClock, 0);
    const onVisible = () => { if (!document.hidden) updateClock(); };
    const interval = window.setInterval(onVisible, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const [feed, setFeed] = useState<MatchFeed>({ matches: initialMatches, demo, source, sourceStatus, updatedAt, game });
  const { matches } = feed;
  const [tab, setTab] = useState<BoardView>(view);
  const [minimum, setMinimum] = useState(1);
  const [league, setLeague] = useState("all");
  const [query, setQuery] = useState("");
  const [showMoreLeagues, setShowMoreLeagues] = useState(false);
  const leagues = useMemo(() => [...new Set(matches.map((match) => match.league))].sort((a, b) => a.localeCompare(b)), [matches]);
  const liveLeagues = useMemo(() => new Set(matches.filter((match) => match.status === "running").map((match) => match.league)), [matches]);
  const priorityLeagues = useMemo(() => (game === "valorant" ? ["VCT", "VCT Americas", "VCT EMEA", "VCT Pacific", "VCT China", "Valorant Champions Tour"] : popularLeagues).filter((name) => leagues.includes(name)), [leagues, game]);
  const otherLeagues = useMemo(() => leagues.filter((name) => !priorityLeagues.includes(name)), [leagues, priorityLeagues]);
  const activeView = tab;
  const list = useMemo(() => matches.filter((match) => (activeView === "all" ? match.status !== "finished" : match.status === activeView) && (league === "all" || match.league === league) && match.importance >= minimum && (!query.trim() || [match.name, match.league, match.tournament, match.serie, ...match.opponents.map(team => team.name)].some(value => value.toLowerCase().includes(query.trim().toLowerCase())))), [matches, activeView, league, minimum, query]);
  const showWorlds = game === "lol" && activeView === "all" && Boolean(worlds);
  const boardMatches = showWorlds && !feed.demo ? list.filter(match => !isWorlds2026Match(match)) : list;
  useEffect(() => {
    if (!shouldPollMatchFeed(sourceStatus)) return;
    return startClientPolling(async (signal) => {
      try {
        const response = await fetch(`/api/matches?game=${game}`, { signal });
        if (!response.ok) throw Error("Match refresh failed");
        const data: MatchFeed = await response.json();
        if (!Array.isArray(data.matches)) throw Error("Invalid match feed");
        if (signal.aborted) return;
        setFeed(previous => mergeMatchFeed(previous, data));
        if (data.sourceStatus !== "healthy") throw Error("Match source unavailable");
      } catch (error) {
        if (!signal.aborted) setFeed(previous => ({ ...previous, sourceStatus: "unavailable" }));
        throw error;
      }
    });
  }, [sourceStatus, game]);

  return <div className="shell">
    <header><Link className="brand" href="/"><span>HOME</span>SPORTS</Link><p>{gameName(game)} esports, ranked by what matters.</p><nav className="game-switch" aria-label="Choose game"><Link className={game === "lol" ? "selected" : ""} href="/"><img src="/league-of-legends-logo.png" alt="" /><span>League of Legends</span></Link><Link className={game === "valorant" ? "selected" : ""} href="/valorant"><img src="/valorant-logo.png" alt="" /><span>Valorant</span></Link></nav><nav className="site-links" aria-label="Site">{game === "lol" && <><Link href="/worlds">Worlds 2026</Link><Link href="/play">Daily games</Link></>}<Link href={`${prefix}/results`}>Results</Link>{game === "lol" && <Link href="/preselect-twitch-extension">Preselect</Link>}</nav><div className="pulse"><b /> {feed.sourceStatus === "healthy" ? `LIVE DATA · ${updatedTimeLabel(feed.updatedAt, localTime)}` : "DEGRADED DATA"}</div></header>
    {feed.demo && <aside>{feed.sourceStatus === "unavailable" ? game === "lol" ? "The live schedule source is temporarily unavailable. Clearly labelled demo matches are shown while it recovers." : "The Valorant schedule source is temporarily unavailable. No unverified matches are shown." : <>{game === "lol" ? "Demo data is shown." : "No Valorant data is available."} Add <code>PANDASCORE_API_KEY</code> to load the live schedule.</>}</aside>}
    {!feed.demo && feed.sourceStatus === "unavailable" && <aside>{matches.length ? "Schedule refresh is delayed. Showing the last available matches while the source recovers." : "The schedule source is temporarily unavailable. Refresh will be retried automatically."}</aside>}
    <nav className="filters" aria-label="Match filters"><div className="filter-left"><div className="match-tabs">{tabs.map((item) => <button className={tab === item.status ? "selected" : ""} onClick={() => setTab(item.status)} key={item.status}>{item.label}</button>)}</div><div className="league-filter"><span>LEAGUES</span><div className="league-chips"><button className={league === "all" ? "league-chip selected" : "league-chip"} onClick={() => setLeague("all")}>All{liveLeagues.size ? <i>{liveLeagues.size} live</i> : null}</button>{priorityLeagues.map((name) => <button className={league === name ? "league-chip selected" : "league-chip"} onClick={() => setLeague(name)} key={name}>{liveLeagues.has(name) && <b className="live-dot" />}{name}</button>)}{showMoreLeagues && otherLeagues.map((name) => <button className={league === name ? "league-chip selected" : "league-chip"} onClick={() => setLeague(name)} key={name}>{liveLeagues.has(name) && <b className="live-dot" />}{name}</button>)}{otherLeagues.length > 0 && <button className="more-leagues" onClick={() => setShowMoreLeagues((shown) => !shown)}>{showMoreLeagues ? "Less leagues −" : `More leagues +${otherLeagues.length}`}</button>}</div></div></div><div className="filter-right"><label className="match-search">SEARCH MATCHES <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Team or competition" /></label><label className="importance-filter">MIN. IMPORTANCE <select value={minimum} onChange={(event) => setMinimum(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((star) => <option key={star} value={star}>{star} ★</option>)}</select></label></div></nav>
    {showWorlds && worlds && <WorldsSection initialData={worlds} filters={{ league, minimum, query }} />}
    <section className="board"><div className="board-heading"><h2>{activeView === "running" ? "Live now" : activeView === "upcoming" ? "Upcoming matches" : activeView === "finished" ? "Recent results" : showWorlds ? "Other competitions" : "The match board"}</h2><small>{boardMatches.length} matches · Updates every minute</small></div>{boardMatches.length ? <div className="cards">{boardMatches.map((match) => <article className={`match ${!feed.demo ? "match-preview-card" : ""} ${match.status}`} key={match.id}>{!feed.demo && <MatchStreamLinks streams={match.streams} status={match.status} matchId={match.id} matchName={match.name} league={match.league} />}<div className="meta"><span className="status">{match.status === "running" ? <LiveBadge /> : timeLabel(match.beginAt, match.status, localTime)}</span><span><a className="league-link" onClick={() => track("Competition Opened", { competition: match.league, level: "season" })} href={match.serieId ? `${prefix}/competition/series/${match.serieId}` : `${prefix}/competition/${match.tournamentId}`}>{match.league}</a> · BO{match.bestOf}</span></div><div className="teams">{match.opponents.slice(0, 2).map((team) => <div className="team" key={team.name}>{team.imageUrl ? <img src={team.imageUrl} alt="" /> : <span className="crest">{team.name.slice(0, 1)}</span>}<a className="team-name-link" onClick={() => track("Team Opened", { team: team.name, teamId: team.id ?? "unknown" })} href={team.id != null ? `${prefix}/teams/${team.id}` : undefined}>{team.name}</a>{match.status !== "upcoming" && <strong>{team.score ?? "—"}</strong>}</div>)}{match.status === "upcoming" && <div className="start-countdown">STARTS IN <b>{startsIn(match.beginAt, now)}</b></div>}</div><footer>{!feed.demo && <MatchPreviewLink id={match.id} name={match.name} game={game} />}<span><StarRating value={match.importance} /> <small>{match.importanceReason}</small></span><a className="competition-link" onClick={() => track("Competition Opened", { competition: match.tournament || match.serie, level: "stage" })} href={`${prefix}/competition/${match.tournamentId}`}>{match.tournament || match.serie}</a></footer>{(match.status === "upcoming" || match.status === "running") && match.opponents.length === 2 && match.odds?.[0] && <div className="odds-row"><span><small>{match.opponents[0].name}</small><b>{match.odds[0].home?.toFixed(2) ?? "—"}</b></span><span><small>{match.opponents[1].name}</small><b>{match.odds[0].away?.toFixed(2) ?? "—"}</b></span></div>}</article>)}</div> : <div className="empty">No matches meet this filter.</div>}</section>
  </div>;
}
