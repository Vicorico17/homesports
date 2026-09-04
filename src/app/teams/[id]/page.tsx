import Link from "next/link";
import { getMatches } from "@/lib/matches";
import { canonicalRole } from "@/lib/data-quality";
import { AuthCalendarControl, FollowTeamButton } from "@/components/follow-team-button";
import { redirect } from "next/navigation";
import { normalizedPlayerName, parseCargoRoster, parseRenderedRosterHtml, type LeaguepediaRosterRow, type RosterPlayer } from "@/lib/roster";

type Player = RosterPlayer;
type TeamMatch = { id: number; status: string; begin_at?: string | null; opponents?: { opponent?: { id?: number; name?: string; image_url?: string | null } }[]; results?: { team_id?: number; score?: number }[]; league?: { name?: string; image_url?: string | null }; tournament?: { id?: number; name?: string; image_url?: string | null } };
const roleIcons: Record<string, string> = { top: "position-top.svg", jungle: "position-jungle.svg", jung: "position-jungle.svg", jungler: "position-jungle.svg", jun: "position-jungle.svg", jng: "position-jungle.svg", jg: "position-jungle.svg", mid: "position-middle.svg", middle: "position-middle.svg", bot: "position-bottom.svg", adc: "position-bottom.svg", carry: "position-bottom.svg", support: "position-utility.svg", sup: "position-utility.svg", utility: "position-utility.svg" };
function roleIcon(role?: string) { const key = role?.toLowerCase().replace(/[^a-z]/g, "") ?? ""; const file = Object.entries(roleIcons).find(([name]) => key.includes(name))?.[1]; return file ? `/icons/${file}` : undefined; }
function isSub(player: Player) { const status = player.status?.toLowerCase() ?? ""; return player.substitute === true || player.is_substitute === true || status.includes("sub"); }
function playerRole(player: Player) { return player.position || player.role || player.lane || player.role_name; }
function displayDate(value?: string | null) { if (!value) return "Date TBD"; const date = new Date(value); return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 2000 ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Date TBD"; }
function displayTime(value?: string | null) { if (!value) return "Time TBD"; const date = new Date(value); return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 2000 ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "Time TBD"; }
function roleRank(player: Player) { const role = canonicalRole(playerRole(player)); return role ? ["top", "jungle", "mid", "adc", "support"].indexOf(role) : -1; }
async function getRenderedRoster(teamName: string, pandaPlayers: Player[]) {
  const params = new URLSearchParams({ action: "parse", format: "json", page: teamName, prop: "text" });
  const response = await fetch(`https://lol.fandom.com/api.php?${params.toString()}`, { next: { revalidate: 21600 } });
  if (!response.ok) return null;
  const payload = await response.json() as { parse?: { text?: { "*"?: string } } };
  const players = parseRenderedRosterHtml(payload.parse?.text?.["*"] ?? "", pandaPlayers);
  return players.length ? players : null;
}
async function getVerifiedRoster(teamName: string, pandaPlayers: Player[]) {
  try {
    const params = new URLSearchParams({ action: "cargoquery", format: "json", tables: "ListplayerCurrent", fields: "Team,Link,Role,IsSubstitute,IsTrainee", where: `Team="${teamName.replace(/"/g, "\\\"")}"`, limit: "50" });
    const response = await fetch(`https://lol.fandom.com/api.php?${params.toString()}`, { next: { revalidate: 1800 } });
    if (!response.ok) return getRenderedRoster(teamName, pandaPlayers);
    const payload = await response.json() as { cargoquery?: LeaguepediaRosterRow[] };
    const rows = payload.cargoquery ?? [];
    if (!rows.length) return getRenderedRoster(teamName, pandaPlayers);
    return parseCargoRoster(rows, pandaPlayers);
  } catch { return getRenderedRoster(teamName, pandaPlayers); }
}
export const revalidate = 300;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { matches } = await getMatches(); const localMatches = matches.filter((match) => match.opponents.some((team) => String(team.id) === id)); const localTeam = localMatches.flatMap((match) => match.opponents).find((opponent) => String(opponent.id) === id);
  let teamName = localTeam?.name; let teamImage = localTeam?.imageUrl; let players: Player[] = []; let teamMatches: TeamMatch[] = []; const token = process.env.PANDASCORE_API_KEY;
  if (token) { const headers = { Authorization: `Bearer ${token}` }; const [teamResponse, matchesResponse] = await Promise.all([fetch(`https://api.pandascore.co/teams/${id}`, { headers, next: { revalidate: 300 } }), fetch(`https://api.pandascore.co/teams/${id}/matches?sort=-begin_at&per_page=20`, { headers, next: { revalidate: 60 } })]); if (teamResponse.ok) { const profile = await teamResponse.json() as { name?: string; image_url?: string | null; players?: Player[] }; teamName = profile.name ?? teamName; teamImage = profile.image_url ?? teamImage; players = profile.players ?? []; } if (matchesResponse.ok) teamMatches = await matchesResponse.json() as TeamMatch[]; }
  if (token && localTeam?.name && teamName && normalizedPlayerName(localTeam.name) !== normalizedPlayerName(teamName)) {
    const response = await fetch(`https://api.pandascore.co/lol/teams?search[name]=${encodeURIComponent(localTeam.name)}&per_page=20`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } });
    if (response.ok) {
      const candidates = await response.json() as { id: number; name: string }[];
      const exact = candidates.find((team) => normalizedPlayerName(team.name) === normalizedPlayerName(localTeam.name));
      if (exact && String(exact.id) !== id) redirect(`/teams/${exact.id}`);
    }
  }
  const pandaPlayers = [...players];
  const verifiedPlayers = teamName ? await getVerifiedRoster(teamName, pandaPlayers) : null;
  if (verifiedPlayers?.length) {
    players = [...verifiedPlayers];
    const verifiedRoles = new Set(players.filter((player) => !isSub(player)).map((player) => canonicalRole(playerRole(player))).filter(Boolean));
    for (const role of ["top", "jungle", "mid", "adc", "support"] as const) {
      if (verifiedRoles.has(role)) continue;
      const candidates = pandaPlayers.filter((player) => !isSub(player) && canonicalRole(playerRole(player)) === role);
      if (candidates.length === 1 && !players.some((player) => normalizedPlayerName(player.nickname ?? player.name) === normalizedPlayerName(candidates[0].nickname ?? candidates[0].name))) players.push(candidates[0]);
    }
  }
  players.sort((a, b) => Number(isSub(a)) - Number(isSub(b)) || (roleRank(a) < 0 ? 99 : roleRank(a)) - (roleRank(b) < 0 ? 99 : roleRank(b)));
  const declaredStarters = players.filter((player) => !isSub(player));
  const starters = ["top", "jungle", "mid", "adc", "support"].flatMap((role) => {
    const player = declaredStarters.find((candidate) => canonicalRole(playerRole(candidate)) === role);
    return player ? [player] : [];
  });
  const substitutes = players.filter(isSub);
  const rosterVerified = Boolean(verifiedPlayers?.length) || (players.length === 5 && starters.length === 5);
  const displayedRoster = rosterVerified ? starters : players;
  const upcoming = teamMatches.filter((match) => match.status === "not_started" || match.status === "running").sort((a, b) => (Date.parse(a.begin_at ?? "") || Number.POSITIVE_INFINITY) - (Date.parse(b.begin_at ?? "") || Number.POSITIVE_INFINITY));
  const recent = teamMatches.filter((match) => match.status === "finished"); const form = recent.slice(0, 5).map((match) => { const current = match.results?.find((result) => result.team_id === Number(id)); const other = match.results?.find((result) => result.team_id !== Number(id)); return current && other && (current.score ?? 0) > (other.score ?? 0) ? "W" : "L"; });
  const renderPlayer = (player: Player, substitute = false, fallbackRole?: string) => { const position = substitute ? (playerRole(player) || fallbackRole) : fallbackRole || playerRole(player); const playerName = player.nickname ?? player.name ?? "Unknown player"; const icon = roleIcon(position); return <div className={`roster-player${substitute ? " substitute-player" : ""}`} key={player.id}>{player.image_url ? <img src={player.image_url} alt="" /> : <i>{playerName.slice(0, 1)}</i>}<span><b title={playerName}>{playerName}</b>{icon ? <img className="role-icon" src={icon} alt={`${position} role`} title={position ?? "Role"} /> : null}</span>{substitute && <small className="substitute-label">SUB</small>}</div>; };
  const mainRoles = ["top", "jungle", "mid", "adc", "support"];
  const followControl = <div className="team-actions"><FollowTeamButton teamId={id} teamName={teamName ?? `Team ${id}`} /><AuthCalendarControl teamId={id} /></div>;
  return <main className="competition-page"><Link href="/">← Back to matches</Link><div className="team-heading">{teamImage ? <img src={teamImage} alt="" /> : <i>{(teamName ?? "T").slice(0, 1)}</i>}<h1>{teamName ?? `Team ${id}`}</h1>{followControl}</div><section className="team-profile"><div><small>RECENT FORM</small><div className="large-form">{form.map((result, index) => <i className={result === "W" ? "win" : "loss"} key={index}>{result}</i>)}{!form.length && <span>No completed matches yet.</span>}</div></div></section><section className="competition-section"><h2>{rosterVerified ? "Main roster" : "Active roster"}</h2>{!rosterVerified && <p className="roster-warning">The source does not identify a verified starting five or substitutes, so all active players are shown without guessing.</p>}{displayedRoster.length ? <div className="roster">{displayedRoster.map((player, index) => renderPlayer(player, false, rosterVerified ? mainRoles[index] : canonicalRole(playerRole(player))))}</div> : <p className="empty">The roster is not available yet.</p>}{substitutes.length ? <><h2 className="sub-roster-heading">Substitutes</h2><div className="roster">{substitutes.map((player) => renderPlayer(player, true))}</div></> : null}</section><section className="competition-section"><h2>Upcoming games</h2>{upcoming.length ? <div className="history-list">{upcoming.map((match) => <div className="history-row upcoming-row" key={match.id}><span className="history-date"><b>{displayDate(match.begin_at)}</b><small>{displayTime(match.begin_at)}</small>{match.tournament?.id ? <a className="competition-label" href={`/competition/${match.tournament.id}`}>{match.tournament.image_url || match.league?.image_url ? <img src={match.tournament.image_url ?? match.league?.image_url ?? ""} alt="" /> : null}{match.league?.name ?? match.tournament.name ?? "Competition"}</a> : <small className="competition-label">{match.league?.name ?? match.tournament?.name ?? ""}</small>}</span><span className="history-teams">{(match.opponents ?? []).map((entry) => <a href={`/teams/${entry.opponent?.id}`} key={entry.opponent?.id ?? entry.opponent?.name}>{entry.opponent?.image_url ? <img src={entry.opponent.image_url} alt="" /> : <i>{(entry.opponent?.name ?? "T").slice(0, 1)}</i>}{entry.opponent?.name ?? "TBD"}</a>)}</span><b className={match.status === "running" ? "live-label" : ""}>{match.status === "running" ? "LIVE" : "VS"}</b></div>)}</div> : <p className="empty">No upcoming games are scheduled for this team yet.</p>}</section><section className="competition-section"><h2>Last games played</h2>{recent.length ? <div className="history-list">{recent.map((match) => { const results = match.results ?? []; const current = results.find((result) => result.team_id === Number(id)); const won = current && results.some((result) => result.team_id !== Number(id) && (current.score ?? 0) > (result.score ?? 0)); return <div className="history-row" key={match.id}><span className="history-date"><b>{displayDate(match.begin_at)}</b><small className="competition-label">{match.league?.image_url ? <img src={match.league.image_url} alt="" /> : null}{match.league?.name ?? match.tournament?.name ?? ""}</small></span><span className="history-teams">{(match.opponents ?? []).map((entry) => { const opponentId = entry.opponent?.id; const opponentResult = results.find((result) => result.team_id === opponentId); const opponentWon = opponentResult && current ? (opponentResult.score ?? 0) > (current.score ?? 0) : false; return <a className={opponentWon ? "winner" : ""} href={`/teams/${opponentId}`} key={opponentId}>{entry.opponent?.image_url ? <img src={entry.opponent.image_url} alt="" /> : <i>{(entry.opponent?.name ?? "T").slice(0, 1)}</i>}{entry.opponent?.name ?? "TBD"}</a>; })}</span><b className={won ? "winner" : ""}>{results.map((result) => result.score ?? "—").join(" – ")}</b></div>; })}</div> : <p className="empty">No completed games found for this team yet.</p>}</section></main>;
}
