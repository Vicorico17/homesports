import { PlayoffBracket } from "@/components/playoff-bracket";
import { type BracketMatch } from "@/lib/bracket";
import Link from "next/link";
import { getMatches, normalizeMatch, type PandaMatch } from "@/lib/matches";
import { getLeaguepediaCompetition } from "@/lib/leaguepedia";
import { isVerifiedPlayoffMatch, normalizedLabel, validDate } from "@/lib/data-quality";


import { deriveStandings, numericStat } from "@/lib/standings";

export const revalidate = 60;

function dateLabel(value: string) {
  return validDate(value) ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Date TBD";
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
  const playoffTournament = tournaments.find((tournament) => tournament.has_bracket && /playoff/i.test(tournament.name ?? "")) ?? tournaments.find((tournament) => tournament.has_bracket);
  const bracketResponse = token && playoffTournament ? await fetch(`https://api.pandascore.co/tournaments/${playoffTournament.id}/brackets`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }) : null;
  const pandaPlayoffMatches = bracketResponse?.ok ? await bracketResponse.json() as BracketMatch[] : [];
  const title = series?.full_name ?? source?.serie ?? series?.name ?? "Competition season";
  const league = series?.league?.name ?? source?.league ?? "COMPETITION";
  const logo = series?.league?.image_url ?? source?.leagueImageUrl;
  const leaguepedia = await getLeaguepediaCompetition([title, source?.serie ?? ""]);
  const knownTeams = new Map(seriesMatches.flatMap((match) => match.opponents.map((team) => [normalizedLabel(team.name), team])));
  const derivedStandings = deriveStandings(seriesMatches.filter(match => !/playoff|play-in/i.test(match.tournament)).map(match => ({ id: match.id, status: match.status, opponents: match.opponents.map(team => ({ opponent: { id: team.id, name: team.name, image_url: team.imageUrl } })), results: match.opponents.map(team => ({ team_id: team.id, score: team.score })) }))).map((row, index) => ({ Team: row.team.name, WinSeries: row.wins, LossSeries: row.losses, Points: undefined, Place: index + 1 }));
  const standings = (leaguepedia?.standings?.length ? leaguepedia.standings : derivedStandings).map((row, index) => ({ ...row, rank: Number(row.Place) || index + 1, team: knownTeams.get(normalizedLabel(row.Team)) }));
  const playoffMatches = (leaguepedia?.matches ?? []).filter(isVerifiedPlayoffMatch);
  const wikiMatches: BracketMatch[] = playoffMatches.map((match, index) => ({ id: index + 1, name: [match.Phase, match.Round].filter(Boolean).join(" ") || "Playoffs", status: match.Winner ? "finished" : "not_started", scheduled_at: match.DateTime_UTC, opponents: [{ opponent: { name: match.Team1 } }, { opponent: { name: match.Team2 } }], results: match.Winner ? [{ score: numericStat(match.Team1Final ?? match.Team1Score) }, { score: numericStat(match.Team2Final ?? match.Team2Score) }] : [] }));
  const bracketMatches = pandaPlayoffMatches.length ? pandaPlayoffMatches : wikiMatches;
  const recent = [...seriesMatches.filter((match) => match.status === "running"), ...seriesMatches.filter((match) => match.status === "finished")].slice(0, 20);

  return <main className="competition-page">
    <Link href="/">← Back to matches</Link>
    <div className="competition-heading">{logo ? <img src={logo} alt="" /> : <i>{league.slice(0, 1)}</i>}<div><p className="eyebrow">{league}</p><h1>{title}</h1></div></div>
    <p className="page-intro">The complete league season. Stage names open their specific tournament pages.{leaguepedia ? " Standings and playoffs are verified against Leaguepedia." : " Fallback standings count confirmed regular-season results; official tiebreakers and points are unavailable."}</p>

    <section className="competition-section"><h2>Leaderboard</h2>{standings.length ? <div className="standings"><div className="standing-row heading"><span>#</span><span>TEAM</span><span>W–L</span><span>POINTS</span><span>FORM</span></div>{standings.map((row) => <div className="standing-row" key={row.Team ?? row.rank}><span>{row.rank}</span><span className="standing-team">{row.team?.imageUrl ? <img src={row.team.imageUrl} alt="" /> : <i>{row.Team?.slice(0, 1)}</i>}{row.team?.id ? <Link href={`/teams/${row.team.id}`}>{row.Team}</Link> : <span>{row.Team ?? "Unknown team"}</span>}</span><b>{numericStat(row.WinSeries) ?? "—"}–{numericStat(row.LossSeries) ?? "—"}</b><span>{row.Points ?? "—"}</span><span /></div>)}</div> : <p className="empty">No verified standings are available for this season yet.</p>}</section>

    <section className="competition-section"><h2>Recent results</h2>{recent.length ? <div className="history-list">{recent.map((match) => { const high = Math.max(...match.opponents.map((team) => team.score ?? -1)); return <div className="history-row" key={match.id}><span className="history-date"><b>{dateLabel(match.beginAt)}</b><Link className="competition-label" href={`/competition/${match.tournamentId}`}>{match.tournamentImageUrl ? <img src={match.tournamentImageUrl} alt="" /> : null}{match.tournament || "Stage"}</Link></span><span className="history-teams">{match.opponents.map((team) => <a className={team.score === high ? "winner" : ""} href={team.id != null ? `/teams/${team.id}` : undefined} key={team.id ?? team.name}>{team.imageUrl ? <img src={team.imageUrl} alt="" /> : <i>{team.name.slice(0, 1)}</i>}{team.name}</a>)}</span><b>{match.opponents.map((team, index) => <span className={team.score === high ? "winner" : ""} key={team.id ?? index}>{team.score ?? "—"}</span>)}</b></div>; })}</div> : <p className="empty">No completed matches are available for this season yet.</p>}</section>

    <section className="competition-section"><h2>Playoff bracket</h2><PlayoffBracket matches={bracketMatches} /></section>
  </main>;
}
