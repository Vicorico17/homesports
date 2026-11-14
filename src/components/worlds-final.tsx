"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Match } from "@/lib/matches";
import type { FinalFeed, FinalTeam } from "@/lib/worlds-final";
import type { StatGroup } from "@/lib/final-details";

const value = (number?: number) => number == null ? "—" : number.toLocaleString("en-GB", { maximumFractionDigits: 2 });
const timestamp = (date?: string | null) => date && Number.isFinite(Date.parse(date)) ? new Date(date).toLocaleString("en-GB", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC" : "Awaiting update";
const teamKey = (name: string) => name.toLowerCase().replace(/esports|gaming|[^a-z0-9]/g, "");
type IconName = "trophy" | "swords" | "gold" | "eye" | "clock" | "shield" | "chart" | "spark";
function Icon({ name = "chart" }: { name?: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    trophy: <><path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v6m-4 3h8m-8-3h8" /></>,
    swords: <><path d="m4 3 13 13m-4 1 4-4m-2 6 4-4m-2 2 4 4M20 3 7 16m0-3 4 4m-6-2 4 4m-2-2-4 4M4 3v4m0-4h4m12 0v4m0-4h-4" /></>,
    gold: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 4 16 4 16 0V6M4 12v6c0 4 16 4 16 0v-6" /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="M12 7v10m-4-5h8" /></>,
    chart: <><path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4" /></>,
    spark: <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" /></>,
  };
  return <svg className="final-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function metricIcon(label: string): IconName {
  if (/gold|money|worth|item|inventory/i.test(label)) return "gold";
  if (/vision|ward|position|map/i.test(label)) return "eye";
  if (/time|clock|seconds|duration/i.test(label)) return "clock";
  if (/health|armor|damage taken|structure/i.test(label)) return "shield";
  if (/kill|damage|assist|combat/i.test(label)) return "swords";
  if (/objective|baron|winner|draft|pick/i.test(label)) return "trophy";
  return "chart";
}
function TeamLogo({ name, url }: { name: string; url?: string | null }) {
  const [failed, setFailed] = useState(false);
  return <span className="final-team-mark">{url && !failed ? <img src={url} alt={`${name} logo`} width={88} height={88} onError={() => setFailed(true)} /> : <span aria-label={name}>{name.slice(0, 3).toUpperCase()}</span>}</span>;
}

export function WorldsFinal({ initialData, match }: { initialData: FinalFeed; match?: Match }) {
  const [feed, setFeed] = useState(initialData);
  const [previousData, setPreviousData] = useState(initialData);
  const router = useRouter();
  if (previousData !== initialData) {
    setPreviousData(initialData);
    setFeed(initialData.status === "ready" ? initialData : { ...feed, status: initialData.status });
  }
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) router.refresh(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [router]);
  const state = feed.state;
  const games = state?.games ?? [];
  const teams = state?.teams ?? match?.opponents.map(team => ({ id: String(team.id ?? team.name), name: team.name, score: team.score })) ?? [];
  const logo = (name: string) => match?.opponents.find(team => teamKey(team.name) === teamKey(name))?.imageUrl;
  const status = state ? state.finished ? "Final result" : state.started ? "In progress · 5-min delay" : "Upcoming" : match ? match.status === "finished" ? "Final result" : match.status === "running" ? "In progress" : "Upcoming" : "Coverage pending";
  const stream = match?.status === "running" ? match.streams.find(stream => stream.official) : undefined;

  return <section className="final-spotlight" aria-labelledby="final-title">
    <div className="final-hero">
      <div className="final-heading"><p className="eyebrow"><Icon name="trophy" /> WORLDS 2026 <span>/</span> THE LAST SERIES</p><span className="final-status"><i />{status}</span></div>
      <div className="final-title-row"><div><h2 id="final-title">One final. <em>Every detail.</em></h2><p>The championship, from the first pick to the final nexus.</p></div><span className="final-edition">WORLD<br />CHAMPIONSHIP <b>26</b></span></div>
      <div className="final-matchup">
        {[0, 1].map(index => {
          const team = teams[index];
          return <div className={`final-team final-team-${index}`} key={index}><TeamLogo key={logo(team?.name ?? "")} name={team?.name ?? "TBD"} url={logo(team?.name ?? "")} /><div><span className="final-team-label">FINALIST {String(index + 1).padStart(2, "0")}</span><strong>{team?.name ?? "Team to be confirmed"}</strong>{state?.finished && state.teams[index]?.won && <span className="final-champion"><Icon name="trophy" /> WORLD CHAMPION</span>}</div><b aria-label={`${team?.name ?? "Team"} score`}>{value(team?.score)}</b></div>;
        })}
        <span className="final-versus">VS</span>
      </div>
      <div className="final-toolbar"><span><Icon name="clock" />{match ? `BEST OF ${match.bestOf} · ${timestamp(match.beginAt)}` : "14 November 2026"}</span><div>{stream && <a href={stream.url} target="_blank" rel="noreferrer">Watch live ↗</a>}{match && <Link href={`/match/${match.id}?game=lol`}>Match centre ↗</Link>}</div></div>
    </div>
    <div id="final-details">
      {state ? <>
        {feed.coverage === "basic" && <p className="final-notice" role="status">Basic scoreboard available. GRID’s extended statistics are temporarily unavailable.</p>}
        <div className="final-section-heading"><h3><Icon name="chart" /> The series</h3><span>Results & statistics · automatically updated</span></div>
        <div className="final-series-stats">{state.teams.map(team => <div key={team.id}><TeamLogo name={team.name} url={logo(team.name)} /><strong>{team.name}</strong><span><Icon name="swords" />{value(team.kills)} kills</span><span>{value(team.deaths)} deaths · {value(team.assists)} assists</span></div>)}</div>
        {games.length > 0 ? <>
          <nav className="final-game-picker" aria-label="Game results">{games.map(game => <a key={game.id} href={`#final-game-${game.number}`}><span>GAME {String(game.number).padStart(2, "0")}</span><strong>{game.finished ? game.teams.find(t => t.won)?.name ?? "Finished" : game.started ? "In progress" : "Not started"}</strong><small>{game.teams.map(t => value(t.kills)).join(" : ")} · kills</small></a>)}</nav>
          {games.map(game => <section id={`final-game-${game.number}`} className="final-game-detail" key={game.id} aria-label={`Game ${game.number} statistics`}><div className="final-game-heading"><h3><span>{String(game.number).padStart(2, "0")}</span> Game {game.number}</h3><span><Icon name="clock" />{game.seconds != null ? `${Math.floor(game.seconds / 60)}:${String(Math.floor(game.seconds % 60)).padStart(2, "0")}` : "Time pending"} · {game.finished ? "Final" : game.started ? "In progress" : "Not started"}</span></div>{game.started || game.finished ? <><div className="final-team-stats">{game.teams.map(team => <TeamStats team={team} logo={logo(team.name)} key={team.id} />)}</div><Stats group={game.details} title="Draft & map snapshot" /></> : <p className="final-notice">Statistics will appear when this game starts and the delayed feed arrives.</p>}</section>)}
        </> : <p className="final-notice">Individual game statistics have not been published yet.</p>}
        <div className="final-series-detail"><Stats group={state.details} title="Series information" /><div className="final-team-stats">{state.teams.map(team => <div key={team.id}><h4>{team.name} · series breakdown</h4><Stats group={team.details} />{team.players.map(player => <div className="final-series-player" key={player.id}><strong>{player.name}</strong><span>{value(player.kills)} kills · {value(player.deaths)} deaths · {value(player.assists)} assists</span><Stats group={player.details} /></div>)}</div>)}</div></div>
      </> : <div className="final-pending"><div className="final-pending-copy"><span className="final-orbit"><Icon name="chart" /></span><div><h3>{match?.status === "finished" ? "The result is in. The breakdown is next." : "The stage is set."}</h3><p>{match ? "Scores are visible above. Official game snapshots will appear here automatically when GRID publishes them." : "Verified teams, results and game snapshots will appear here as they become available."}</p></div><span className="final-awaiting">{feed.status === "unavailable" ? "GRID UNAVAILABLE" : "AWAITING GRID"}</span></div><div className="final-coverage">{([["swords", "Every player", "KDA, damage & participation"], ["gold", "The economy", "Gold, items & power plays"], ["trophy", "Every objective", "Draft, dragons & structures"], ["eye", "Beyond the score", "Vision, abilities & map state"]] as const).map(([icon, title, description]) => <div key={title}><Icon name={icon} /><strong>{title}</strong><span>{description}</span></div>)}</div>{match?.mapWinners.length ? <ol className="final-game-results">{match.mapWinners.map((winner, index) => <li key={index}><span>GAME {index + 1}</span><strong><Icon name="trophy" />{winner}</strong></li>)}</ol> : null}</div>}
    </div>
    <footer className="final-source"><div><img src="/grid-logo.png" alt="GRID" width={48} height={24} /><span>{state ? <>Official Riot Esports Data powered by GRID<br />5-minute live delay · Updated {timestamp(state.updatedAt ?? feed.fetchedAt)}</> : <>{match ? "Schedule & results: PandaScore · " : ""}Official GRID statistics pending<br />Game snapshots carry a 5-minute live delay.</>}</span></div>{state && feed.status !== "ready" && <span role="status">Refresh unavailable · showing last received statistics</span>}<a href="https://lolesports.com/en-GB/news/build-with-official-league-of-legends-esports-data" target="_blank" rel="noreferrer">About the data ↗</a><p>HomeSports and any product on it are not endorsed or sponsored by Riot Games or GRID.</p></footer>
  </section>;
}

function Stats({ group, title, depth = 0 }: { group?: StatGroup; title?: string; depth?: number }) {
  if (!group || (!group.fields.length && !group.groups.length)) return null;
  return <div className={`final-stat-group final-stat-depth-${Math.min(depth, 2)}`}>
    {(title || depth > 0) && <h5><Icon name={metricIcon(title ?? group.title)} />{title ?? group.title}</h5>}
    {group.fields.length > 0 && <dl className="final-stat-grid">{group.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{typeof field.value === "number" ? value(field.value) + (field.unit ?? "") : typeof field.value === "boolean" ? field.value ? "Yes" : "No" : field.value ?? "—"}</dd></div>)}</dl>}
    {group.groups.length > 0 && <div className="final-stat-children">{group.groups.map((child, i) => <Stats group={child} depth={depth + 1} key={`${child.title}-${i}`} />)}</div>}
  </div>;
}

function TeamStats({ team, logo }: { team: FinalTeam; logo?: string | null }) {
  return <article><div className="final-team-heading"><TeamLogo name={team.name} url={logo} /><h4>{team.name}</h4>{team.won && <span><Icon name="trophy" />WINNER</span>}</div><dl className="final-metrics">{([["Kills", team.kills, "swords"], ["Deaths", team.deaths, "shield"], ["Assists", team.assists, "spark"], ["Net worth", team.netWorth, "gold"]] as const).map(([label, number, icon]) => <div key={label}><dt><Icon name={icon} />{label}</dt><dd>{value(number)}</dd></div>)}</dl>
    {team.players.length > 0 && <div className="final-table-scroll" tabIndex={0} role="region" aria-label={`${team.name} player scoreboard`}><table><caption>PLAYER SCOREBOARD</caption><thead><tr><th scope="col">Player / champion</th><th scope="col">K / D / A</th><th scope="col">Net worth</th><th scope="col">Gold earned</th><th scope="col">Damage*</th><th scope="col">Vision</th></tr></thead><tbody>{team.players.map(player => <tr key={player.id}><th scope="row">{player.name}{player.champion && <small>{player.champion}</small>}</th><td>{value(player.kills)} / {value(player.deaths)} / {value(player.assists)}</td><td>{value(player.netWorth)}</td><td>{value(player.goldEarned)}</td><td>{value(player.damage)}</td><td>{value(player.vision)}</td></tr>)}</tbody></table></div>}
    <p className="final-missing">* Damage to all targets. — means this statistic was not supplied.</p>
    <Stats group={team.details} title="Team breakdown" />
    {team.players.map(player => <section className="final-player-card" key={player.id}><header><span className="final-player-icon"><Icon name="shield" /></span><div><h5>{player.name}</h5><span>{player.champion ?? "Champion pending"}</span></div><b>{value(player.kills)} / {value(player.deaths)} / {value(player.assists)}</b></header><Stats group={player.details} /></section>)}
  </article>;
}
