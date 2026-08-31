import Link from "next/link";
import { getMatches } from "@/lib/matches";
import { getLeaguepediaCompetition } from "@/lib/leaguepedia";
import { isVerifiedPlayoffMatch, normalizedLabel, validDate } from "@/lib/data-quality";

export const revalidate = 60;

function dateLabel(value: string) {
  return validDate(value) ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Date TBD";
}

function roundLabel(phase?: string, round?: string) {
  return (round || phase || "Playoffs").replace(/\s+match\s+\d+$/i, "").replace(/\s+\d+$/, "");
}

export default async function SeriesCompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { matches } = await getMatches();
  const seriesMatches = matches.filter((match) => String(match.serieId) === id);
  const source = seriesMatches[0];
  const token = process.env.PANDASCORE_API_KEY;
  const response = token ? await fetch(`https://api.pandascore.co/series/${id}`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }) : null;
  const series = response?.ok ? await response.json() as { full_name?: string; name?: string; year?: number; league?: { name?: string; image_url?: string | null } } : null;
  const title = series?.full_name ?? source?.serie ?? series?.name ?? "Competition season";
  const league = series?.league?.name ?? source?.league ?? "COMPETITION";
  const logo = series?.league?.image_url ?? source?.leagueImageUrl;
  const leaguepedia = await getLeaguepediaCompetition([title, source?.serie ?? ""]);
  const knownTeams = new Map(seriesMatches.flatMap((match) => match.opponents.map((team) => [normalizedLabel(team.name), team])));
  const standings = (leaguepedia?.standings ?? []).map((row, index) => ({ ...row, rank: Number(row.Place) || index + 1, team: knownTeams.get(normalizedLabel(row.Team)) }));
  const playoffMatches = (leaguepedia?.matches ?? []).filter(isVerifiedPlayoffMatch);
  const rounds = [...new Map(playoffMatches.map((match) => {
    const label = roundLabel(match.Phase, match.Round);
    return [label, playoffMatches.filter((candidate) => roundLabel(candidate.Phase, candidate.Round) === label)] as const;
  })).entries()];
  const recent = seriesMatches.filter((match) => match.status === "finished").slice(0, 20);

  return <main className="competition-page">
    <Link href="/">← Back to matches</Link>
    <div className="competition-heading">{logo ? <img src={logo} alt="" /> : <i>{league.slice(0, 1)}</i>}<div><p className="eyebrow">{league}</p><h1>{title}</h1></div></div>
    <p className="page-intro">The complete league season. Stage names open their specific tournament pages.{leaguepedia ? " Standings and playoffs are verified against Leaguepedia." : " Verified standings and playoff data are currently unavailable."}</p>

    <section className="competition-section"><h2>Leaderboard</h2>{standings.length ? <div className="standings"><div className="standing-row heading"><span>#</span><span>TEAM</span><span>W–L</span><span>POINTS</span><span>FORM</span></div>{standings.map((row) => <div className="standing-row" key={row.Team ?? row.rank}><span>{row.rank}</span><span className="standing-team">{row.team?.imageUrl ? <img src={row.team.imageUrl} alt="" /> : <i>{row.Team?.slice(0, 1)}</i>}{row.team?.id ? <Link href={`/teams/${row.team.id}`}>{row.Team}</Link> : <span>{row.Team ?? "Unknown team"}</span>}</span><b>{Number(row.WinSeries) || 0}–{Number(row.LossSeries) || 0}</b><span>{row.Points ?? "—"}</span><span /></div>)}</div> : <p className="empty">No verified standings are available for this season yet.</p>}</section>

    <section className="competition-section"><h2>Recent results</h2>{recent.length ? <div className="history-list">{recent.map((match) => { const high = Math.max(...match.opponents.map((team) => team.score ?? -1)); return <div className="history-row" key={match.id}><span className="history-date"><b>{dateLabel(match.beginAt)}</b><Link className="competition-label" href={`/competition/${match.tournamentId}`}>{match.tournamentImageUrl ? <img src={match.tournamentImageUrl} alt="" /> : null}{match.tournament || "Stage"}</Link></span><span className="history-teams">{match.opponents.map((team) => <Link className={team.score === high ? "winner" : ""} href={`/teams/${team.id}`} key={team.id ?? team.name}>{team.imageUrl ? <img src={team.imageUrl} alt="" /> : <i>{team.name.slice(0, 1)}</i>}{team.name}</Link>)}</span><b>{match.opponents.map((team, index) => <span className={team.score === high ? "winner" : ""} key={team.id ?? index}>{team.score ?? "—"}</span>)}</b></div>; })}</div> : <p className="empty">No completed matches are available for this season yet.</p>}</section>

    <section className="competition-section"><h2>Playoff bracket</h2>{rounds.length ? <div className="bracket-board">{rounds.map(([round, roundMatches]) => <div className="bracket-round" key={round}><h3>{round}</h3><div className="bracket-round-matches">{roundMatches.map((match, index) => <div className="bracket-match" key={match.MatchId ?? index}>{[match.Team1, match.Team2].map((team, teamIndex) => <div className="bracket-team" key={teamIndex}><i>{team?.slice(0, 1) || "?"}</i><span>{team || "TBD"}</span><b>{match.Winner ? Number(teamIndex ? match.Team2Final ?? match.Team2Score : match.Team1Final ?? match.Team1Score) || 0 : "—"}</b></div>)}</div>)}</div></div>)}</div> : <p className="empty">No verified playoff bracket is available for this season yet.</p>}</section>
  </main>;
}
