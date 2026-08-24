import Link from "next/link";
import { getMatches } from "@/lib/matches";

type Player = { id: number; nickname?: string; name?: string; image_url?: string | null; role?: string };

export const revalidate = 300;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { matches } = await getMatches();
  const teamMatches = matches.filter((match) => match.opponents.some((team) => String(team.id) === id));
  const team = teamMatches.flatMap((match) => match.opponents).find((opponent) => String(opponent.id) === id);
  let players: Player[] = [];
  const token = process.env.PANDASCORE_API_KEY;
  if (token) {
    const response = await fetch(`https://api.pandascore.co/teams/${id}`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } });
    if (response.ok) players = ((await response.json()) as { players?: Player[] }).players ?? [];
  }
  const form = teamMatches.filter((match) => match.status === "finished" && match.opponents.length === 2 && match.opponents.every((opponent) => typeof opponent.score === "number")).sort((a, b) => new Date(b.beginAt).getTime() - new Date(a.beginAt).getTime()).map((match) => { const current = match.opponents.find((opponent) => String(opponent.id) === id)!; const other = match.opponents.find((opponent) => String(opponent.id) !== id)!; return (current.score ?? 0) > (other.score ?? 0) ? "W" : "L"; });
  return <main className="competition-page"><Link href="/teams">← Team directory</Link><p className="eyebrow">TEAM PROFILE</p><h1>{team?.name ?? "Team"}</h1><section className="team-profile"><div><small>RECENT FORM</small><div className="large-form">{form.slice(0, 5).map((result, index) => <i className={result === "W" ? "win" : "loss"} key={index}>{result}</i>)}{!form.length && <span>No completed matches yet.</span>}</div></div><div><small>MATCHES TRACKED</small><b>{teamMatches.length}</b></div></section><section className="competition-section"><h2>Roster</h2>{players.length ? <div className="roster">{players.map((player) => <div className="roster-player" key={player.id}>{player.image_url ? <img src={player.image_url} alt="" /> : <i>{(player.nickname ?? player.name ?? "?").slice(0, 1)}</i>}<span><b>{player.nickname ?? player.name ?? "Unknown player"}</b><small>{player.name && player.nickname ? player.name : player.role ?? "Player"}</small></span></div>)}</div> : <p className="empty">The live roster will appear when PandaScore returns the team profile.</p>}</section></main>;
}
