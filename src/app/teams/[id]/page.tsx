import Link from "next/link";
import { getMatches } from "@/lib/matches";

type Player = { id: number; nickname?: string; name?: string; image_url?: string | null; role?: string };
type TeamMatch = { id: number; status: string; begin_at: string; opponents?: { opponent?: { id?: number; name?: string } }[]; results?: { team_id?: number; score?: number }[]; league?: { name?: string }; tournament?: { name?: string } };

export const revalidate = 300;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { matches } = await getMatches();
  const localMatches = matches.filter((match) => match.opponents.some((team) => String(team.id) === id));
  const localTeam = localMatches.flatMap((match) => match.opponents).find((opponent) => String(opponent.id) === id);
  const token = process.env.PANDASCORE_API_KEY;
  let players: Player[] = [];
  let teamMatches: TeamMatch[] = [];
  if (token) {
    const headers = { Authorization: `Bearer ${token}` };
    const [teamResponse, matchesResponse] = await Promise.all([
      fetch(`https://api.pandascore.co/teams/${id}`, { headers, next: { revalidate: 300 } }),
      fetch(`https://api.pandascore.co/teams/${id}/matches?sort=-begin_at&per_page=20`, { headers, next: { revalidate: 60 } })
    ]);
    if (teamResponse.ok) players = ((await teamResponse.json()) as { players?: Player[] }).players ?? [];
    if (matchesResponse.ok) teamMatches = await matchesResponse.json() as TeamMatch[];
  }
  const form = teamMatches.filter((match) => match.status === "finished").slice(0, 5).map((match) => {
    const current = match.results?.find((result) => result.team_id === Number(id));
    const other = match.results?.find((result) => result.team_id !== Number(id));
    return current && other && (current.score ?? 0) > (other.score ?? 0) ? "W" : "L";
  });
  const fallbackForm = localMatches.filter((match) => match.status === "finished").slice(0, 5).map((match) => { const current = match.opponents.find((opponent) => String(opponent.id) === id); const other = match.opponents.find((opponent) => String(opponent.id) !== id); return current && other && (current.score ?? 0) > (other.score ?? 0) ? "W" : "L"; });
  return <main className="competition-page"><Link href="/">← Back to matches</Link><p className="eyebrow">TEAM PROFILE</p><h1>{localTeam?.name ?? `Team ${id}`}</h1><section className="team-profile"><div><small>RECENT FORM</small><div className="large-form">{(form.length ? form : fallbackForm).map((result, index) => <i className={result === "W" ? "win" : "loss"} key={index}>{result}</i>)}{!form.length && !fallbackForm.length && <span>No completed matches yet.</span>}</div></div><div><small>MATCHES TRACKED</small><b>{teamMatches.length || localMatches.length}</b></div></section><section className="competition-section"><h2>Roster</h2>{players.length ? <div className="roster">{players.map((player) => <div className="roster-player" key={player.id}>{player.image_url ? <img src={player.image_url} alt="" /> : <i>{(player.nickname ?? player.name ?? "?").slice(0, 1)}</i>}<span><b>{player.nickname ?? player.name ?? "Unknown player"}</b><small>{player.name && player.nickname ? player.name : player.role ?? "Player"}</small></span></div>)}</div> : <p className="empty">The current roster will appear when PandaScore returns it.</p>}</section><section className="competition-section"><h2>Last games played</h2>{teamMatches.length ? <div className="history-list">{teamMatches.filter((match) => match.status === "finished").map((match) => <div className="history-row" key={match.id}><small>{new Date(match.begin_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small><span>{(match.opponents ?? []).map((entry) => entry.opponent?.name ?? "TBD").join(" vs ")}<small>{match.league?.name ?? match.tournament?.name ?? ""}</small></span><b>{(match.results ?? []).map((result) => result.score ?? "—").join(" – ")}</b></div>)}</div> : <p className="empty">No completed games found for this team yet.</p>}</section></main>;
}
