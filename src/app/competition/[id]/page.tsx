import Link from "next/link";
import { getMatches } from "@/lib/matches";
import { getLeaguepediaCompetition } from "@/lib/leaguepedia";

type Standing = { rank?: number; team?: { id?: number; name?: string; image_url?: string | null }; wins?: number; losses?: number; points?: number; score?: number };
type Tournament = { name?: string; image_url?: string | null; league?: { name?: string } };
type TournamentMatch = { id: number; status: string; begin_at: string; opponents?: { opponent?: { id?: number; name?: string; image_url?: string | null } }[]; results?: { team_id?: number; score?: number }[] };
type BracketMatch = { id: number; name?: string; status?: string; scheduled_at?: string | null; opponents?: { opponent?: { id?: number; name?: string; image_url?: string | null } }[]; results?: { score?: number }[]; previous_matches?: { type?: string; match_id?: number }[] };

export const revalidate = 60;

async function panda<T>(path: string, token: string) {
  const response = await fetch(`https://api.pandascore.co/${path}`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } });
  return response.ok ? (await response.json() as T) : null;
}

function resultFor(match: TournamentMatch, teamId?: number) { return match.results?.find((result) => result.team_id === teamId)?.score; }
function displayDate(value?: string | null) { if (!value) return "Date TBD"; const date = new Date(value); return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 2000 ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Date TBD"; }
function roundName(match: BracketMatch) { const label = match.name?.split(":")[0]?.trim() || "Playoffs"; return label.replace(/\s+match\s+\d+$/i, "").replace(/\s+\d+$/, ""); }
function bracketTeam(match: BracketMatch, index: number) { const name = match.opponents?.[index]?.opponent?.name; if (name) return name; const previous = match.previous_matches?.[index]; return previous?.match_id ? `${previous.type === "loser" ? "Loser" : "Winner"} of #${previous.match_id}` : "TBD"; }
function roundRank(label: string) { const value = label.toLowerCase(); if (value.includes("quarter")) return 10; if (value.includes("semi")) return 20; if (value.includes("final")) return 30; const number = value.match(/\d+/); return number ? Number(number[0]) : 50; }

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { matches: feedMatches } = await getMatches();
  const token = process.env.PANDASCORE_API_KEY;
  let tournament: Tournament | null = null;
  let standings: Standing[] = [];
  let tournamentMatches: TournamentMatch[] = [];
  let bracket: BracketMatch[] = [];

  if (token) {
    const [tournamentData, standingsData, matchesData, bracketData] = await Promise.all([
      panda<Tournament>(`tournaments/${id}`, token),
      panda<Standing[]>(`tournaments/${id}/standings?per_page=100`, token),
      panda<TournamentMatch[]>(`tournaments/${id}/matches?per_page=100&sort=-begin_at`, token),
      panda<BracketMatch[]>(`tournaments/${id}/brackets`, token),
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
  const logo = tournament?.image_url ?? source?.tournamentImageUrl ?? source?.leagueImageUrl;
  const leaguepedia = await getLeaguepediaCompetition([source?.tournament ?? "", source?.serie ?? "", title]);
  const wikiRows: Standing[] = (leaguepedia?.standings ?? []).map((row) => ({ rank: Number(row.Place) || undefined, team: { name: row.Team }, wins: Number(row.WinSeries) || undefined, losses: Number(row.LossSeries) || undefined, points: Number(row.Points) || undefined }));
  const wikiBracket: BracketMatch[] = (leaguepedia?.matches ?? []).filter((match) => `${match.Phase ?? ""} ${match.Round ?? ""}`.match(/playoff|knockout|quarter|semi|final|upper|lower|bracket/i)).map((match, index) => ({ id: Number(match.MatchId?.replace(/\D/g, "")) || index + 1, name: match.Round || match.Phase || "Playoffs", status: "finished", scheduled_at: match.DateTime_UTC ?? null, opponents: [{ opponent: { name: match.Team1 } }, { opponent: { name: match.Team2 } }], results: [{ score: Number(match.Team1Final ?? match.Team1Score) || 0 }, { score: Number(match.Team2Final ?? match.Team2Score) || 0 }] }));
  const bracketSource = wikiBracket.length ? wikiBracket : bracket;
  const rows: Standing[] = wikiRows.length ? wikiRows : standings.length ? standings : [...new Map(localMatches.flatMap((match) => match.opponents.map((team) => [team.id, team]))).values()].map((team, index) => ({ rank: index + 1, team: { id: team.id, name: team.name, image_url: team.imageUrl } }));
  const rounds = [...new Map(bracketSource.map((match) => [roundName(match), bracketSource.filter((item) => roundName(item) === roundName(match))])).entries()].sort(([a, aMatches], [b, bMatches]) => { const aDate = Math.min(...aMatches.map((match) => match.scheduled_at ? Date.parse(match.scheduled_at) : Number.POSITIVE_INFINITY)); const bDate = Math.min(...bMatches.map((match) => match.scheduled_at ? Date.parse(match.scheduled_at) : Number.POSITIVE_INFINITY)); return (Number.isFinite(aDate) || Number.isFinite(bDate)) ? aDate - bDate : roundRank(a) - roundRank(b); });
  const bracketSlots = Math.max(...rounds.map(([, matches]) => matches.length), 1);
  const finishedMatches = tournamentMatches.filter((match) => match.status === "finished").slice(0, 20);

  return <main className="competition-page">
    <Link href="/">← Back to matches</Link>
    <div className="competition-heading">{logo ? <img src={logo} alt="" /> : <i>{title.slice(0, 1)}</i>}<div><p className="eyebrow">{league}</p><h1>{title}</h1></div></div>
    <p className="page-intro">Official standings, match history, and tournament bracket.</p>

    <section className="competition-section"><h2>Leaderboard</h2>{rows.length ? <div className="standings"><div className="standing-row heading"><span>#</span><span>TEAM</span><span>W–L</span><span>POINTS</span><span>FORM</span></div>{rows.map((row, index) => <div className="standing-row" key={row.team?.id ?? row.team?.name ?? index}><span>{row.rank ?? index + 1}</span><span className="standing-team">{row.team?.image_url ? <img src={row.team.image_url} alt="" /> : <i>{row.team?.name?.slice(0, 1)}</i>}<a href={`/teams/${row.team?.id}`}>{row.team?.name ?? "Unknown team"}</a></span><b>{row.wins ?? "—"}–{row.losses ?? "—"}</b><span>{row.points ?? row.score ?? "—"}</span><span className="form">{localMatches.filter((match) => match.status === "finished" && match.opponents.some((team) => team.id === row.team?.id)).slice(0, 5).map((match, resultIndex) => { const current = match.opponents.find((team) => team.id === row.team?.id); const other = match.opponents.find((team) => team.id !== row.team?.id); const win = current && other && (current.score ?? 0) > (other.score ?? 0); return <i className={win ? "win" : "loss"} key={resultIndex}>{win ? "W" : "L"}</i>; })}</span></div>)}</div> : <p className="empty">No standings are available for this competition yet.</p>}</section>

    <section className="competition-section"><h2>Recent results</h2>{finishedMatches.length ? <div className="history-list">{finishedMatches.map((match) => { const opponents = match.opponents ?? []; const scores = opponents.map((entry) => resultFor(match, entry.opponent?.id)); const high = Math.max(...scores.map((score) => score ?? -1)); return <div className="history-row" key={match.id}><span className="history-date"><b>{displayDate(match.begin_at)}</b><small className="competition-label">{logo ? <img src={logo} alt="" /> : null}{title}</small></span><span className="history-teams">{opponents.map((entry, index) => <a className={scores[index] === high ? "winner" : ""} href={`/teams/${entry.opponent?.id}`} key={entry.opponent?.id}>{entry.opponent?.image_url ? <img src={entry.opponent.image_url} alt="" /> : <i>{(entry.opponent?.name ?? "T").slice(0, 1)}</i>}{entry.opponent?.name ?? "TBD"}</a>)}</span><b>{scores.map((score, index) => <span className={scores[index] === high ? "winner" : ""} key={index}>{score ?? "—"}</span>)}</b></div>; })}</div> : <p className="empty">No completed matches are available for this competition yet.</p>}</section>

    <section className="competition-section"><div className="section-heading"><h2>Bracket</h2>{bracket.length ? <Link className="bracket-link" href={`/bracket/${id}`}>Open full bracket ↗</Link> : null}</div>{rounds.length ? <div className="bracket-board">{rounds.map(([round, matches], roundIndex) => <div className="bracket-round" key={round}><h3>{round}</h3><div className="bracket-round-matches" style={{ gridTemplateRows: `repeat(${bracketSlots}, minmax(82px, auto))` }}>{matches.map((match, matchIndex) => { const scores = match.results?.map((result) => result.score ?? "—") ?? []; const span = Math.max(1, Math.floor(bracketSlots / matches.length)); return <div className="bracket-match" style={{ gridRow: `${matchIndex * span + 1} / span ${span}` }} key={match.id}>{[0, 1].map((index) => <div className="bracket-team" key={index}>{match.opponents?.[index]?.opponent?.image_url ? <img src={match.opponents[index].opponent.image_url} alt="" /> : <i>{bracketTeam(match, index).slice(0, 1)}</i>}<span>{bracketTeam(match, index)}</span><b>{scores[index] ?? "—"}</b></div>)}</div>; })}</div></div>)}</div> : <p className="empty">No bracket is available for this competition yet.</p>}</section>
  </main>;
}
