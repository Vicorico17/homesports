import { panda } from "@/lib/pandascore";
import { notFound } from "next/navigation";
import { PlayoffBracket } from "@/components/playoff-bracket";
import { type BracketMatch } from "@/lib/bracket";
import Link from "next/link";
import type { Metadata } from "next";
import { getMatches, normalizeMatch, type PandaMatch } from "@/lib/matches";
import { getLeaguepediaCompetition } from "@/lib/leaguepedia";
import { isVerifiedPlayoffMatch } from "@/lib/data-quality";
import { CompetitionMatchList } from "@/components/competition-match-list";
import { competitionSchedule, mergeCompetitionMatches } from "@/lib/competition-schedule";

import { deriveStandings, numericStat } from "@/lib/standings";

type Standing = { rank?: number; team?: { id?: number; name?: string; image_url?: string | null }; wins?: number; losses?: number; points?: number; score?: number };
type Tournament = { name?: string; image_url?: string | null; league?: { name?: string } };
type TournamentMatch = PandaMatch;

export const revalidate = 60;

// Generate on first visit, then reuse the complete route through ISR.
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Competition", robots: { index: false } };
  const tournament = await panda<{ name?: string }>(`tournaments/${id}`, 300);
  return { title: tournament?.name ?? "Competition", description: tournament?.name ? `${tournament.name} standings, results, and playoff bracket on HomeSports.` : "League of Legends tournament standings and bracket on HomeSports.", alternates: { canonical: `/competition/${id}` } };
}

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const { matches: feedMatches } = await getMatches();
  const token = process.env.PANDASCORE_API_KEY;
  let tournament: Tournament | null = null;
  let standings: Standing[] = [];
  let tournamentMatches: TournamentMatch[] = [];
  let bracket: BracketMatch[] = [];

  if (token) {
    const [tournamentData, standingsData, matchesData, bracketData] = await Promise.all([
      panda<Tournament>(`tournaments/${id}`),
      panda<Standing[]>(`tournaments/${id}/standings?per_page=100`),
      panda<TournamentMatch[]>(`tournaments/${id}/matches?per_page=100&sort=-begin_at`),
      panda<BracketMatch[]>(`tournaments/${id}/brackets`),
    ]);
    tournament = tournamentData;
    standings = standingsData ?? [];
    tournamentMatches = matchesData ?? [];
    bracket = bracketData ?? [];
  }

  const localMatches = feedMatches.filter((match) => String(match.tournamentId) === id);
  const source = localMatches[0];
  const title = tournament?.name ?? source?.tournament ?? source?.serie ?? "Competition";
  const league = tournament?.league?.name ?? source?.league ?? "COMPETITION";
  const isPlayIn = /\bplay[ -]?ins?\b/i.test(title);
  const logo = tournament?.image_url ?? source?.tournamentImageUrl ?? source?.leagueImageUrl;
  const leaguepedia = await getLeaguepediaCompetition([source?.tournament ?? "", source?.serie ?? "", title]);
  const wikiRows: Standing[] = (leaguepedia?.standings ?? []).map((row) => ({ rank: numericStat(row.Place), team: { name: row.Team }, wins: numericStat(row.WinSeries), losses: numericStat(row.LossSeries), points: numericStat(row.Points) }));
  const derivedRows = deriveStandings(tournamentMatches);
  const wikiBracket: BracketMatch[] = (leaguepedia?.matches ?? []).filter(isVerifiedPlayoffMatch).map((match, index) => ({ id: index + 1, name: [match.Phase, match.Round].filter(Boolean).join(" ") || "Playoffs", status: match.Winner ? "finished" : "not_started", scheduled_at: match.DateTime_UTC ?? null, opponents: [{ opponent: { name: match.Team1 } }, { opponent: { name: match.Team2 } }], results: match.Winner ? [{ score: numericStat(match.Team1Final ?? match.Team1Score) }, { score: numericStat(match.Team2Final ?? match.Team2Score) }] : [] }));
  const bracketSource = bracket.length ? bracket : wikiBracket;
  const rows: Standing[] = standings.length ? standings : wikiRows.length ? wikiRows : derivedRows.map((row, index) => ({ rank: index + 1, team: row.team, wins: row.wins, losses: row.losses, points: undefined }));
  const schedule = competitionSchedule(mergeCompetitionMatches(
    localMatches.filter(match => !tournamentMatches.some(detail => detail.id === match.id && !["running", "not_started", "finished"].includes(detail.status))),
    tournamentMatches.filter(match => ["running", "not_started", "finished"].includes(match.status))
      .map(match => normalizeMatch(match, match.status === "running" ? "running" : match.status === "finished" ? "finished" : "upcoming")),
  ));

  return <main className="competition-page">
    <Link href="/">← Back to matches</Link>
    <div className="competition-heading">{logo ? <img src={logo} alt="" /> : <i>{title.slice(0, 1)}</i>}<div><p className="eyebrow">{league}</p><h1>{title}</h1></div></div>
    <p className="page-intro">{isPlayIn ? "Follow the Play-In bracket. Select a match to see the teams and win chances." : <>Standings, match history, and verified tournament bracket data.{leaguepedia ? ` Competition data verified against ${leaguepedia.source}.` : " Fallback standings count completed matches with confirmed scores."}</>}</p>

    <section className="competition-section"><h2>Live now</h2>{schedule.live.length ? <CompetitionMatchList matches={schedule.live} /> : <p className="empty">No matches are live in this competition right now.</p>}</section>
    <section className="competition-section"><h2>Upcoming matches</h2>{schedule.upcoming.length ? <CompetitionMatchList matches={schedule.upcoming.slice(0, 20)} /> : <p className="empty">No upcoming fixtures are published yet.</p>}</section>

    {!isPlayIn && <><section className="competition-section"><h2>Leaderboard</h2>{rows.length ? <div className="standings"><div className="standing-row heading"><span>#</span><span>TEAM</span><span>W–L</span><span>POINTS</span><span>FORM</span></div>{rows.map((row, index) => <div className="standing-row" key={row.team?.id ?? row.team?.name ?? index}><span>{row.rank ?? index + 1}</span><span className="standing-team">{row.team?.image_url ? <img src={row.team.image_url} alt="" /> : <i>{row.team?.name?.slice(0, 1)}</i>}{row.team?.id != null ? <a href={`/teams/${row.team.id}`}>{row.team.name}</a> : <span>{row.team?.name ?? "Unknown team"}</span>}</span><b>{row.wins ?? "—"}–{row.losses ?? "—"}</b><span>{row.points ?? row.score ?? "—"}</span><span className="form">{localMatches.filter((match) => match.status === "finished" && match.opponents.some((team) => row.team?.id != null && team.id === row.team.id)).slice(0, 5).map((match, resultIndex) => { const current = match.opponents.find((team) => team.id === row.team?.id); const other = match.opponents.find((team) => team.id !== row.team?.id); const known = current?.score != null && other?.score != null && current.score !== other.score; const win = known && current.score! > other.score!; return <i className={known ? win ? "win" : "loss" : ""} key={resultIndex}>{known ? win ? "W" : "L" : "—"}</i>; })}</span></div>)}</div> : <p className="empty">No standings are available for this competition yet.</p>}</section>

    <section className="competition-section"><h2>Recent results</h2>{schedule.results.length ? <CompetitionMatchList matches={schedule.results.slice(0, 20)} /> : <p className="empty">No completed matches are available for this competition yet.</p>}</section>

    </>}
    <section className="competition-section"><div className="section-heading"><h2>{isPlayIn ? "Play-In bracket" : "Bracket"}</h2>{bracket.length ? <Link className="bracket-link" href={`/bracket/${id}`}>Open full bracket ↗</Link> : null}</div><PlayoffBracket matches={bracketSource} matchPreviews={bracket.length > 0} /></section>
  </main>;
}
