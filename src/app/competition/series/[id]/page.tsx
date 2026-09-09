import Link from "next/link";
import { getMatches, normalizeMatch, type PandaMatch } from "@/lib/matches";
import { getLeaguepediaCompetition } from "@/lib/leaguepedia";
import { isVerifiedPlayoffMatch, normalizedLabel, validDate } from "@/lib/data-quality";

type PandaBracketMatch = { id: number; name?: string; status?: string; scheduled_at?: string | null; begin_at?: string | null; opponents?: { opponent?: { id?: number; name?: string; image_url?: string | null } }[]; results?: { score?: number }[]; previous_matches?: { type?: string; match_id?: number }[] };

export const revalidate = 60;

function dateLabel(value: string) {
  return validDate(value) ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Date TBD";
}

function roundLabel(phase?: string, round?: string) {
  return (round || phase || "Playoffs").replace(/\s+match\s+\d+$/i, "").replace(/\s+\d+$/, "");
}

export default async function SeriesCompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { matches: feedMatches } = await getMatches();
  const token = process.env.PANDASCORE_API_KEY;
  const response = token ? await fetch(`https://api.pandascore.co/series/${id}`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }) : null;
  const series = response?.ok ? await response.json() as { full_name?: string; name?: string; year?: number; league?: { name?: string; image_url?: string | null } } : null;
  const seriesMatchesResponse = token ? await fetch(`https://api.pandascore.co/series/${id}/matches?per_page=100&sort=-begin_at`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }) : null;
  const seriesMatchesPayload = seriesMatchesResponse?.ok ? await seriesMatchesResponse.json() as PandaMatch[] : [];
  const seriesMatches = seriesMatchesPayload.length ? seriesMatchesPayload.map((match) => normalizeMatch(match, match.status === "running" ? "running" : match.status === "finished" ? "finished" : "upcoming")) : feedMatches.filter((match) => String(match.serieId) === id);
  const source = seriesMatches[0];
  const tournamentsResponse = token ? await fetch(`https://api.pandascore.co/series/${id}/tournaments?per_page=100`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }) : null;
  const tournaments = tournamentsResponse?.ok ? await tournamentsResponse.json() as { id: number; name?: string; has_bracket?: boolean }[] : [];
  const playoffTournament = tournaments.find((tournament) => tournament.has_bracket && /playoff/i.test(tournament.name ?? ""));
  const bracketResponse = token && playoffTournament ? await fetch(`https://api.pandascore.co/tournaments/${playoffTournament.id}/brackets`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }) : null;
  const pandaPlayoffMatches = bracketResponse?.ok ? await bracketResponse.json() as PandaBracketMatch[] : [];
  const title = series?.full_name ?? source?.serie ?? series?.name ?? "Competition season";
  const league = series?.league?.name ?? source?.league ?? "COMPETITION";
  const logo = series?.league?.image_url ?? source?.leagueImageUrl;
  const leaguepedia = await getLeaguepediaCompetition([title, source?.serie ?? ""]);
  const knownTeams = new Map(seriesMatches.flatMap((match) => match.opponents.map((team) => [normalizedLabel(team.name), team])));
  const derivedStandingMap = new Map<string, { Team: string; WinSeries: number; LossSeries: number; Points: number; team?: typeof seriesMatches[number]["opponents"][number] }>();
  seriesMatches.filter((match) => match.status === "finished" && !/playoff|play-in/i.test(match.tournament)).forEach((match) => match.opponents.forEach((team) => { const key = normalizedLabel(team.name); const current = derivedStandingMap.get(key) ?? { Team: team.name, WinSeries: 0, LossSeries: 0, Points: 0, team }; const score = team.score ?? -1; const other = match.opponents.find((candidate) => candidate.id !== team.id)?.score ?? -1; if (score > other) current.WinSeries += 1; else if (other >= 0) current.LossSeries += 1; current.Points += Math.max(0, score); derivedStandingMap.set(key, current); }));
  const derivedStandings = [...derivedStandingMap.values()].sort((a, b) => b.WinSeries - a.WinSeries || b.Points - a.Points).map((row, index) => ({ ...row, Place: index + 1 }));
  const standings = (leaguepedia?.standings?.length ? leaguepedia.standings : derivedStandings).map((row, index) => ({ ...row, rank: Number(row.Place) || index + 1, team: knownTeams.get(normalizedLabel(row.Team)) }));
  const playoffMatches = (leaguepedia?.matches ?? []).filter(isVerifiedPlayoffMatch);
  const fallbackPlayoffMatches = pandaPlayoffMatches.map((match) => ({ MatchId: String(match.id), DateTime_UTC: match.scheduled_at ?? match.begin_at ?? undefined, Team1: match.opponents?.[0]?.opponent?.name ?? "TBD", Team2: match.opponents?.[1]?.opponent?.name ?? "TBD", Team1Score: match.results?.[0]?.score, Team2Score: match.results?.[1]?.score, Team1Final: undefined, Team2Final: undefined, Winner: match.status === "finished" ? "finished" : undefined, Phase: match.name?.split(":")[0] ?? "Playoffs", Round: match.name?.split(":")[0] ?? "Playoffs" }));
  const renderedPlayoffMatches = playoffMatches.length ? playoffMatches : fallbackPlayoffMatches;
  const rounds = [...new Map(renderedPlayoffMatches.map((match) => {
    const label = roundLabel(match.Phase, match.Round);
    return [label, renderedPlayoffMatches.filter((candidate) => roundLabel(candidate.Phase, candidate.Round) === label)] as const;
  })).entries()];
  const recent = [...seriesMatches.filter((match) => match.status === "running"), ...seriesMatches.filter((match) => match.status === "finished")].slice(0, 20);

  return <main className="competition-page">
    <Link href="/">← Back to matches</Link>
    <div className="competition-heading">{logo ? <img src={logo} alt="" /> : <i>{league.slice(0, 1)}</i>}<div><p className="eyebrow">{league}</p><h1>{title}</h1></div></div>
    <p className="page-intro">The complete league season. Stage names open their specific tournament pages.{leaguepedia ? " Standings and playoffs are verified against Leaguepedia." : " Verified standings and playoff data are currently unavailable."}</p>

    <section className="competition-section"><h2>Leaderboard</h2>{standings.length ? <div className="standings"><div className="standing-row heading"><span>#</span><span>TEAM</span><span>W–L</span><span>POINTS</span><span>FORM</span></div>{standings.map((row) => <div className="standing-row" key={row.Team ?? row.rank}><span>{row.rank}</span><span className="standing-team">{row.team?.imageUrl ? <img src={row.team.imageUrl} alt="" /> : <i>{row.Team?.slice(0, 1)}</i>}{row.team?.id ? <Link href={`/teams/${row.team.id}`}>{row.Team}</Link> : <span>{row.Team ?? "Unknown team"}</span>}</span><b>{Number(row.WinSeries) || 0}–{Number(row.LossSeries) || 0}</b><span>{row.Points ?? "—"}</span><span /></div>)}</div> : <p className="empty">No verified standings are available for this season yet.</p>}</section>

    <section className="competition-section"><h2>Recent results</h2>{recent.length ? <div className="history-list">{recent.map((match) => { const high = Math.max(...match.opponents.map((team) => team.score ?? -1)); return <div className="history-row" key={match.id}><span className="history-date"><b>{dateLabel(match.beginAt)}</b><Link className="competition-label" href={`/competition/${match.tournamentId}`}>{match.tournamentImageUrl ? <img src={match.tournamentImageUrl} alt="" /> : null}{match.tournament || "Stage"}</Link></span><span className="history-teams">{match.opponents.map((team) => <Link className={team.score === high ? "winner" : ""} href={`/teams/${team.id}`} key={team.id ?? team.name}>{team.imageUrl ? <img src={team.imageUrl} alt="" /> : <i>{team.name.slice(0, 1)}</i>}{team.name}</Link>)}</span><b>{match.opponents.map((team, index) => <span className={team.score === high ? "winner" : ""} key={team.id ?? index}>{team.score ?? "—"}</span>)}</b></div>; })}</div> : <p className="empty">No completed matches are available for this season yet.</p>}</section>

    <section className="competition-section"><h2>Playoff bracket</h2>{rounds.length ? <div className="bracket-board">{rounds.map(([round, roundMatches]) => <div className="bracket-round" key={round}><h3>{round}</h3><div className="bracket-round-matches">{roundMatches.map((match, index) => <div className="bracket-match" key={match.MatchId ?? index}>{[match.Team1, match.Team2].map((team, teamIndex) => <div className="bracket-team" key={teamIndex}><i>{team?.slice(0, 1) || "?"}</i><span>{team || "TBD"}</span><b>{match.Winner ? Number(teamIndex ? match.Team2Final ?? match.Team2Score : match.Team1Final ?? match.Team1Score) || 0 : "—"}</b></div>)}</div>)}</div></div>)}</div> : <p className="empty">Playoff bracket data is temporarily unavailable. The live match board remains current.</p>}</section>
  </main>;
}
