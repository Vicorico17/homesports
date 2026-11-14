"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Match } from "@/lib/matches";
import type { FinalFeed, FinalTeam } from "@/lib/worlds-final";

const value = (number?: number) => number == null ? "—" : number.toLocaleString("en-GB");
const timestamp = (date?: string | null) => date && Number.isFinite(Date.parse(date)) ? new Date(date).toLocaleString("en-GB", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC" : "Awaiting update";

export function WorldsFinal({ initialData, match }: { initialData: FinalFeed; match?: Match }) {
  const [feed, setFeed] = useState(initialData);
  const [previousData, setPreviousData] = useState(initialData);
  const router = useRouter();
  if (previousData !== initialData) {
    setPreviousData(initialData);
    setFeed(initialData.status === "ready" ? initialData : { ...feed, status: initialData.status });
  }
  const [showStats, setShowStats] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  useEffect(() => {
    // Refresh the display through Next.js, without publishing a reusable JSON data feed.
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [router]);

  const state = feed.state;
  const games = state?.games ?? [];
  const activeGame = games.find(game => game.id === selectedGame) ?? [...games].reverse().find(game => game.started) ?? games[0];
  const teams = state?.teams ?? match?.opponents.map(team => ({ id: String(team.id ?? team.name), name: team.name, score: team.score })) ?? [];
  const status = state ? state.finished ? "Finished" : state.started ? "In progress · delayed" : "Upcoming" : match ? match.status === "finished" ? "Finished" : match.status === "running" ? "In progress" : "Upcoming" : "Coverage pending";
  const stream = match?.status === "running" ? match.streams.find(stream => stream.official) : undefined;

  return <section className="final-spotlight" aria-labelledby="final-title">
    <div className="final-heading"><div><p className="eyebrow">WORLDS 2026 / THE LAST SERIES</p><h2 id="final-title">One final. <span>Every detail.</span></h2><p>Follow the championship match, game by game.</p></div><span className="final-status">{status}</span></div>
    <div className="final-matchup">
      {[0, 1].map(index => <div className="final-team" key={index}><span className="final-team-mark" aria-hidden="true">{teams[index]?.name.slice(0, 3).toUpperCase() ?? "?"}</span><strong>{teams[index]?.name ?? "Team to be confirmed"}</strong><b aria-label={showStats ? `${teams[index]?.name ?? "Team"} score` : "Score hidden"}>{showStats ? value(teams[index]?.score) : "—"}</b></div>)}
    </div>
    <div className="final-toolbar"><span>{match ? `BO${match.bestOf} · ${timestamp(match.beginAt)}` : "November 14, 2026"}</span><div><button type="button" aria-expanded={showStats} aria-controls="final-details" onClick={() => setShowStats(previous => !previous)}>{showStats ? "Hide scores & stats" : "Reveal scores & stats"}</button>{stream && <a href={stream.url} target="_blank" rel="noreferrer">Official stream ↗</a>}{match && <Link href={`/match/${match.id}?game=lol`}>Match preview ↗</Link>}</div></div>
    <div id="final-details" hidden={!showStats}>
      {state ? <>
        <div className="final-series-stats"><span>Series totals</span>{state.teams.map(team => <div key={team.id}><strong>{team.name}</strong><span>{value(team.kills)} kills</span><span>{value(team.deaths)} deaths</span></div>)}</div>
        {games.length > 0 ? <>
          <div className="final-game-picker" role="group" aria-label="Select a game">{games.map(game => <button type="button" key={game.id} aria-pressed={activeGame?.id === game.id} onClick={() => setSelectedGame(game.id)}><strong>Game {game.number}</strong><span>{game.finished ? "Finished" : game.started ? "In progress" : "Not started"}</span></button>)}</div>
          {activeGame && <div className="final-game-detail"><div className="final-game-heading"><h3>Game {activeGame.number}</h3><span>{activeGame.seconds != null ? `${Math.floor(activeGame.seconds / 60)}:${String(Math.floor(activeGame.seconds % 60)).padStart(2, "0")} game time` : "Game time unavailable"}</span></div>{activeGame.started || activeGame.finished ? <div className="final-team-stats">{activeGame.teams.map(team => <TeamStats team={team} key={team.id} />)}</div> : <p className="final-notice">Statistics will appear when this game starts and the delayed feed arrives.</p>}</div>}
        </> : <p className="final-notice">Individual game statistics have not been published yet.</p>}
      </> : <div className="final-notice"><strong>Detailed match statistics are not available yet.</strong><p>{match ? "Available scores come from PandaScore. Official game and player statistics will appear when GRID publishes the match snapshots." : "We’re waiting for verified match data. Teams, scores, and player statistics will appear when available."}</p>{match?.mapWinners.length ? <ol className="final-game-results">{match.mapWinners.map((winner, index) => <li key={index}>Completed game {index + 1}: {winner}</li>)}</ol> : null}</div>}
    </div>
    <div className="final-source"><span>{state ? <><img src="/grid-logo.png" alt="GRID" width={48} height={24} /> Official Riot Esports Data powered by GRID · 5-minute live delay · Updated {timestamp(state.updatedAt ?? feed.fetchedAt)}</> : <> {match ? "Schedule & results: PandaScore · " : ""}Official GRID statistics pending</>}</span>{state && feed.status !== "ready" && <span role="status">Refresh unavailable · showing last received statistics</span>}{state && <span>HomeSports and any product on it are not endorsed or sponsored by Riot Games or GRID.</span>}<a href="https://lolesports.com/en-GB/news/build-with-official-league-of-legends-esports-data" target="_blank" rel="noreferrer">About the data ↗</a></div>
  </section>;
}

function TeamStats({ team }: { team: FinalTeam }) {
  return <article><div className="final-team-heading"><h4>{team.name}</h4>{team.won && <span>WINNER</span>}</div><dl className="final-metrics"><div><dt>Kills</dt><dd>{value(team.kills)}</dd></div><div><dt>Deaths</dt><dd>{value(team.deaths)}</dd></div><div><dt>Assists</dt><dd>{value(team.assists)}</dd></div><div><dt>Net worth</dt><dd>{value(team.netWorth)}</dd></div></dl>{team.objectives.length > 0 && <dl className="final-objectives">{team.objectives.map((objective, index) => <div key={`${objective.name}-${index}`}><dt>{objective.name}</dt><dd>{value(objective.count)}</dd></div>)}</dl>}{team.players.length > 0 ? <div className="final-table-scroll"><table><caption>{team.name} player statistics</caption><thead><tr><th scope="col">Player / champion</th><th scope="col"><abbr title="Kills / deaths / assists">K / D / A</abbr></th><th scope="col">Net worth</th><th scope="col">Gold earned</th><th scope="col">Damage dealt</th><th scope="col">Vision</th></tr></thead><tbody>{team.players.map(player => <tr key={player.id}><th scope="row">{player.name}{player.champion && <small>{player.champion}</small>}</th><td>{value(player.kills)} / {value(player.deaths)} / {value(player.assists)}</td><td>{value(player.netWorth)}</td><td>{value(player.goldEarned)}</td><td>{value(player.damage)}</td><td>{value(player.vision)}</td></tr>)}</tbody></table></div> : <p className="final-notice">Player statistics pending.</p>}<p className="final-missing">— means the provider has not supplied this statistic.</p></article>;
}
