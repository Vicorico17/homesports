import { panda, pandaResult } from "@/lib/pandascore";
import Link from "next/link";
import { LiveBadge } from "@/components/live-badge";
import { MatchStreamLinks } from "@/components/match-stream-links";
import { normalizeMatchStreams, type PandaStreamFields } from "@/lib/streams";
import type { Metadata } from "next";
import { getMatches } from "@/lib/matches";
import { canonicalRole } from "@/lib/data-quality";
import { notFound } from "next/navigation";
import type { RosterPlayer } from "@/lib/roster";
import { currentRoster, isRosterTeam, type RosterTeam } from "@/lib/roster-integrity";

type Player = RosterPlayer;
type TeamMatch = PandaStreamFields & { videogame?: { slug?: string }; id: number; status: string; begin_at?: string | null; opponents?: { opponent?: { id?: number; name?: string; image_url?: string | null } }[]; results?: { team_id?: number; score?: number }[]; league?: { name?: string; image_url?: string | null }; tournament?: { id?: number; name?: string; image_url?: string | null } };
const roleIcons: Record<string, string> = { top: "position-top.svg", jungle: "position-jungle.svg", jung: "position-jungle.svg", jungler: "position-jungle.svg", jun: "position-jungle.svg", jng: "position-jungle.svg", jg: "position-jungle.svg", mid: "position-middle.svg", middle: "position-middle.svg", bot: "position-bottom.svg", adc: "position-bottom.svg", carry: "position-bottom.svg", support: "position-utility.svg", sup: "position-utility.svg", utility: "position-utility.svg" };
function roleIcon(role?: string) { const key = role?.toLowerCase().replace(/[^a-z]/g, "") ?? ""; const file = Object.entries(roleIcons).find(([name]) => key.includes(name))?.[1]; return file ? `/icons/${file}` : undefined; }
function isSub(player: Player) { const status = player.status?.toLowerCase() ?? ""; return player.substitute === true || player.is_substitute === true || status.includes("sub"); }
function playerRole(player: Player) { return player.position || player.role || player.lane || player.role_name; }
function displayDate(value?: string | null) { if (!value) return "Date TBD"; const date = new Date(value); return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 2000 ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Date TBD"; }
function displayTime(value?: string | null) { if (!value) return "Time TBD"; const date = new Date(value); return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 2000 ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "Time TBD"; }
function roleRank(player: Player) { const role = canonicalRole(playerRole(player)); return role ? ["top", "jungle", "mid", "adc", "support"].indexOf(role) : -1; }
export const revalidate = 300;

// Generate on first visit, then reuse the complete route through ISR.
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) return { title: "Team", robots: { index: false } };
  const profile = await panda<RosterTeam>(`teams/${id}`, 300);
  const team = isRosterTeam(profile, Number(id), "lol") ? profile : null;
  return { title: team?.name ?? "Team", description: team?.name ? `${team.name} roster, upcoming matches, and results on HomeSports.` : "League of Legends team matches and roster on HomeSports.", alternates: { canonical: `/teams/${id}` } };
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) notFound();
  const [feed, profileResponse, history] = await Promise.all([
    getMatches(), pandaResult<RosterTeam>(`teams/${id}`, 300),
    panda<TeamMatch[]>(`teams/${id}/matches?sort=-begin_at&per_page=20`),
  ]);
  const profile = profileResponse.data;
  if (profile && !isRosterTeam(profile, Number(id), "lol")) notFound();
  const localMatches = feed.matches.filter(match => match.opponents.some(team => String(team.id) === id));
  const localTeam = localMatches.flatMap(match => match.opponents).find(team => String(team.id) === id);
  const teamName = profile?.name ?? localTeam?.name;
  const teamImage = profile?.image_url ?? localTeam?.imageUrl;
  const roster = currentRoster(profile, Number(id), "lol", profileResponse.sourceDate);
  const players = [...roster.players];
  let teamMatches = (Array.isArray(history) ? history : []).filter(match => ["lol", "league-of-legends"].includes(match.videogame?.slug ?? "") && match.opponents?.some(entry => entry.opponent?.id === Number(id)));
  if (!teamName) notFound();
  teamMatches = [...new Map([...teamMatches, ...localMatches.filter(match => match.status !== "finished").map(match => ({ id: match.id, status: match.status === "upcoming" ? "not_started" : match.status, begin_at: match.beginAt, opponents: match.opponents.map(team => ({ opponent: { id: team.id, name: team.name, image_url: team.imageUrl } })), results: match.opponents.map(team => ({ team_id: team.id, score: team.score })), league: { name: match.league, image_url: match.leagueImageUrl }, tournament: { id: match.tournamentId, name: match.tournament, image_url: match.tournamentImageUrl } }))].map(match => [match.id, match])).values()];
  players.sort((a, b) => Number(isSub(a)) - Number(isSub(b)) || (roleRank(a) < 0 ? 99 : roleRank(a)) - (roleRank(b) < 0 ? 99 : roleRank(b)));
  const displayedRoster = players.filter(player => !isSub(player));
  const substitutes = players.filter(isSub);
  const upcoming = teamMatches.filter((match) => match.status === "not_started" || match.status === "running").sort((a, b) => (Date.parse(a.begin_at ?? "") || Number.POSITIVE_INFINITY) - (Date.parse(b.begin_at ?? "") || Number.POSITIVE_INFINITY));
  const recent = teamMatches.filter((match) => match.status === "finished"); const form = recent.slice(0, 5).map((match) => { const current = match.results?.find((result) => result.team_id === Number(id)); const other = match.results?.find((result) => result.team_id !== Number(id)); return current?.score == null || other?.score == null || current.score === other.score ? "—" : current.score > other.score ? "W" : "L"; });
  const renderPlayer = (player: Player, substitute = false, fallbackRole?: string) => { const position = substitute ? (playerRole(player) || fallbackRole) : fallbackRole || playerRole(player); const playerName = player.nickname ?? player.name ?? "Unknown player"; const icon = roleIcon(position); return <div className={`roster-player${substitute ? " substitute-player" : ""}`} key={player.id ?? playerName}>{player.image_url ? <img src={player.image_url} alt="" /> : <i>{playerName.slice(0, 1)}</i>}<span><b title={playerName}>{playerName}</b>{icon ? <img className="role-icon" src={icon} alt={`${position} role`} title={position ?? "Role"} /> : null}</span>{substitute && <small className="substitute-label">SUB</small>}</div>; };
  return <main className="competition-page"><Link href="/">← Back to matches</Link><div className="team-heading">{teamImage ? <img src={teamImage} alt="" /> : <i>{(teamName ?? "T").slice(0, 1)}</i>}<h1>{teamName ?? `Team ${id}`}</h1></div><section className="team-profile"><div><small>RECENT FORM</small><div className="large-form">{form.map((result, index) => <i className={result === "W" ? "win" : "loss"} key={index}>{result}</i>)}{!form.length && <span>No completed matches yet.</span>}</div></div></section><section className="competition-section"><h2>Current roster</h2><p className="roster-warning">Source: PandaScore team membership. This is not a confirmed starting five or a historical match lineup.</p>{roster.omitted > 0 && <p className="roster-warning">Some entries were omitted because their identity, activity or team membership could not be resolved.</p>}{displayedRoster.length ? <div className="roster">{displayedRoster.map((player) => renderPlayer(player, false, canonicalRole(playerRole(player))))}</div> : <p className="empty">The roster is not available yet.</p>}{substitutes.length ? <><h2 className="sub-roster-heading">Substitutes</h2><div className="roster">{substitutes.map((player) => renderPlayer(player, true))}</div></> : null}</section><section className="competition-section"><h2>Upcoming games</h2>{upcoming.length ? <div className="history-list">{upcoming.map((match) => <div className="history-row upcoming-row" key={match.id}><span className="history-date"><b>{displayDate(match.begin_at)}</b><small>{displayTime(match.begin_at)}</small>{match.tournament?.id ? <a className="competition-label" href={`/competition/${match.tournament.id}`}>{match.tournament.image_url || match.league?.image_url ? <img src={match.tournament.image_url ?? match.league?.image_url ?? ""} alt="" /> : null}{match.league?.name ?? match.tournament.name ?? "Competition"}</a> : <small className="competition-label">{match.league?.name ?? match.tournament?.name ?? ""}</small>}</span><span className="history-teams">{(match.opponents ?? []).map((entry) => <a href={entry.opponent?.id != null ? `/teams/${entry.opponent.id}` : undefined} key={entry.opponent?.id ?? entry.opponent?.name}>{entry.opponent?.image_url ? <img src={entry.opponent.image_url} alt="" /> : <i>{(entry.opponent?.name ?? "T").slice(0, 1)}</i>}{entry.opponent?.name ?? "TBD"}</a>)}</span><b className={match.status === "running" ? "live-label" : ""}>{match.status === "running" ? <LiveBadge /> : "VS"}</b><MatchStreamLinks streams={localMatches.find(item => item.id === match.id)?.streams ?? normalizeMatchStreams(match)} status={match.status} matchId={match.id} matchName={(match.opponents ?? []).map(item => item.opponent?.name ?? "TBD").join(" vs ")} league={match.league?.name} compact /></div>)}</div> : <p className="empty">No upcoming games are scheduled for this team yet.</p>}</section><section className="competition-section"><h2>Last games played</h2>{recent.length ? <div className="history-list">{recent.map((match) => { const results = match.results ?? []; const current = results.find((result) => result.team_id === Number(id)); const won = current && results.some((result) => result.team_id !== Number(id) && (current.score ?? 0) > (result.score ?? 0)); return <div className="history-row" key={match.id}><span className="history-date"><b>{displayDate(match.begin_at)}</b><small className="competition-label">{match.league?.image_url ? <img src={match.league.image_url} alt="" /> : null}{match.league?.name ?? match.tournament?.name ?? ""}</small></span><span className="history-teams">{(match.opponents ?? []).map((entry) => { const opponentId = entry.opponent?.id; const opponentResult = results.find((result) => result.team_id === opponentId); const opponentWon = opponentResult?.score != null && results.some(result => result.team_id !== opponentId && result.score != null && opponentResult.score! > result.score); return <a className={opponentWon ? "winner" : ""} href={opponentId != null ? `/teams/${opponentId}` : undefined} key={opponentId}>{entry.opponent?.image_url ? <img src={entry.opponent.image_url} alt="" /> : <i>{(entry.opponent?.name ?? "T").slice(0, 1)}</i>}{entry.opponent?.name ?? "TBD"}</a>; })}</span><b className={won ? "winner" : ""}>{(match.opponents ?? []).map(entry => results.find(result => entry.opponent?.id != null && result.team_id === entry.opponent.id)?.score ?? "—").join(" – ")}</b></div>; })}</div> : <p className="empty">No completed games found for this team yet.</p>}</section></main>;
}
