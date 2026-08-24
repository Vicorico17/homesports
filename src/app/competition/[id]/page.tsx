import Link from "next/link";
import { getMatches } from "@/lib/matches";

type Standing = { name: string; imageUrl?: string | null; wins: number; losses: number; mapsFor: number; mapsAgainst: number; form: string[] };

export const revalidate = 60;

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { matches } = await getMatches();
  const competitionMatches = matches.filter((match) => String(match.tournamentId) === id);
  const source = competitionMatches[0];
  const table = new Map<string, Standing>();
  competitionMatches.filter((match) => match.status === "finished" && match.opponents.length === 2 && match.opponents.every((team) => typeof team.score === "number")).forEach((match) => {
    const [home, away] = match.opponents;
    [home, away].forEach((team) => { if (!table.has(team.name)) table.set(team.name, { name: team.name, imageUrl: team.imageUrl, wins: 0, losses: 0, mapsFor: 0, mapsAgainst: 0, form: [] }); });
    const homeRow = table.get(home.name)!; const awayRow = table.get(away.name)!; const homeWon = (home.score ?? 0) > (away.score ?? 0);
    homeRow.wins += homeWon ? 1 : 0; homeRow.losses += homeWon ? 0 : 1; homeRow.mapsFor += home.score ?? 0; homeRow.mapsAgainst += away.score ?? 0; homeRow.form.unshift(homeWon ? "W" : "L");
    awayRow.wins += homeWon ? 0 : 1; awayRow.losses += homeWon ? 1 : 0; awayRow.mapsFor += away.score ?? 0; awayRow.mapsAgainst += home.score ?? 0; awayRow.form.unshift(homeWon ? "L" : "W");
  });
  const standings = [...table.values()].sort((a, b) => b.wins - a.wins || (b.mapsFor - b.mapsAgainst) - (a.mapsFor - a.mapsAgainst));
  return <main className="competition-page"><Link href="/competitions">← All competitions</Link><p className="eyebrow">{source?.league ?? "COMPETITION"}</p><h1>{source?.tournament || source?.serie || "Competition"}</h1><p className="page-intro">Standings and history calculated from completed PandaScore results.</p><section className="competition-section"><h2>Leaderboard</h2>{standings.length ? <div className="standings"><div className="standing-row heading"><span>#</span><span>TEAM</span><span>W–L</span><span>DIFF</span><span>FORM</span></div>{standings.map((team, index) => <div className="standing-row" key={team.name}><span>{index + 1}</span><span className="standing-team">{team.imageUrl ? <img src={team.imageUrl} alt="" /> : <i>{team.name.slice(0, 1)}</i>}{team.name}</span><b>{team.wins}–{team.losses}</b><span>{team.mapsFor - team.mapsAgainst > 0 ? "+" : ""}{team.mapsFor - team.mapsAgainst}</span><span className="form">{team.form.slice(0, 5).map((result, resultIndex) => <i className={result === "W" ? "win" : "loss"} key={`${team.name}-${resultIndex}`}>{result}</i>)}</span></div>)}</div> : <p className="empty">Standings will appear when completed results are available.</p>}</section><section className="competition-section"><h2>Match history</h2><div className="history-list">{competitionMatches.filter((match) => match.status === "finished").map((match) => <div className="history-row" key={match.id}><small>{new Date(match.beginAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small><span>{match.opponents.map((team) => team.name).join(" vs ")}</span><b>{match.opponents.map((team) => team.score ?? "—").join(" – ")}</b></div>)}</div></section></main>;
}
