import { panda } from "@/lib/pandascore";
import { notFound } from "next/navigation";
import { PlayoffBracket } from "@/components/playoff-bracket";
import { type BracketMatch } from "@/lib/bracket";
import Link from "next/link";
import type { Metadata } from "next";
import { getMatches, normalizeMatch, type PandaMatch } from "@/lib/matches";
import { getLeaguepediaCompetition } from "@/lib/leaguepedia";
import { isVerifiedPlayoffMatch, normalizedLabel } from "@/lib/data-quality";


import { deriveStandings, numericStat } from "@/lib/standings";
import { CompetitionMatchList } from "@/components/competition-match-list";
import { competitionSchedule, mergeCompetitionMatches } from "@/lib/competition-schedule";

export const revalidate = 60;

// Generate on first visit, then reuse the complete route through ISR.
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Competition season", robots: { index: false } };
  const serie = await panda<{ full_name?: string; name?: string }>(`series/${id}`, 300);
  const name = serie?.full_name ?? serie?.name;
  return { title: name ?? "Competition season", description: name ? `${name} schedule, standings, results, and playoffs on HomeSports.` : "League of Legends season schedule and standings on HomeSports.", alternates: { canonical: `/competition/series/${id}` } };
}

export default async function SeriesCompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const { matches: feedMatches } = await getMatches();
  const [series, history, stages] = await Promise.all([
    panda<{ full_name?: string; name?: string; year?: number; league?: { name?: string; image_url?: string | null } }>(`series/${id}`, 300),
    panda<PandaMatch[]>(`series/${id}/matches?per_page=100&sort=-begin_at`),
    panda<{ id: number; name?: string; has_bracket?: boolean }[]>(`series/${id}/tournaments?per_page=100`, 300),
  ]);
  const seriesMatchesPayload = history ?? [];
  const seriesMatches = mergeCompetitionMatches(
    feedMatches.filter(match => String(match.serieId) === id && !seriesMatchesPayload.some(detail => detail.id === match.id && !["running", "not_started", "finished"].includes(detail.status))),
    seriesMatchesPayload.filter(match => ["running", "not_started", "finished"].includes(match.status)).map(match => normalizeMatch(match, match.status === "running" ? "running" : match.status === "finished" ? "finished" : "upcoming")),
  );
  const source = seriesMatches[0];
  const tournaments = stages ?? [];
  const playoffTournament = tournaments.find((tournament) => tournament.has_bracket && /playoff/i.test(tournament.name ?? "")) ?? tournaments.find((tournament) => tournament.has_bracket);
  const pandaPlayoffMatches = playoffTournament ? await panda<BracketMatch[]>(`tournaments/${playoffTournament.id}/brackets`) ?? [] : [];
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
  const schedule = competitionSchedule(seriesMatches);

  return <main className="competition-page">
    <Link href="/">← Back to matches</Link>
    <div className="competition-heading">{logo ? <img src={logo} alt="" /> : <i>{league.slice(0, 1)}</i>}<div><p className="eyebrow">{league}</p><h1>{title}</h1></div></div>
    <p className="page-intro">The complete league season. Stage names open their specific tournament pages.{leaguepedia ? " Standings and playoffs are verified against Leaguepedia." : " Fallback standings count confirmed regular-season results; official tiebreakers and points are unavailable."}</p>

    <section className="competition-section"><h2>Live now</h2>{schedule.live.length ? <CompetitionMatchList matches={schedule.live} /> : <p className="empty">No matches are live in this season right now.</p>}</section>
    <section className="competition-section"><h2>Upcoming matches</h2>{schedule.upcoming.length ? <CompetitionMatchList matches={schedule.upcoming.slice(0, 20)} /> : <p className="empty">No upcoming fixtures are published yet.</p>}</section>

    <section className="competition-section"><h2>Leaderboard</h2>{standings.length ? <div className="standings"><div className="standing-row heading"><span>#</span><span>TEAM</span><span>W–L</span><span>POINTS</span><span>FORM</span></div>{standings.map((row) => <div className="standing-row" key={row.Team ?? row.rank}><span>{row.rank}</span><span className="standing-team">{row.team?.imageUrl ? <img src={row.team.imageUrl} alt="" /> : <i>{row.Team?.slice(0, 1)}</i>}{row.team?.id ? <Link href={`/teams/${row.team.id}`}>{row.Team}</Link> : <span>{row.Team ?? "Unknown team"}</span>}</span><b>{numericStat(row.WinSeries) ?? "—"}–{numericStat(row.LossSeries) ?? "—"}</b><span>{row.Points ?? "—"}</span><span /></div>)}</div> : <p className="empty">No verified standings are available for this season yet.</p>}</section>

    <section className="competition-section"><h2>Recent results</h2>{schedule.results.length ? <CompetitionMatchList matches={schedule.results.slice(0, 20)} /> : <p className="empty">No completed matches are available for this season yet.</p>}</section>

    <section className="competition-section"><h2>Playoff bracket</h2><PlayoffBracket matches={bracketMatches} /></section>
  </main>;
}
