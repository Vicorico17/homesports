import Link from "next/link";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { matches } = await getMatches();
  const teams = [...new Map(matches.flatMap((match) => match.opponents.filter((team) => team.id).map((team) => [team.id, team]))).values()]
    .filter((team) => !q || team.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  return <main className="competition-page"><Link href="/">← Back to matches</Link><p className="eyebrow">TEAM DIRECTORY</p><h1>Find your <em>team.</em></h1><form className="team-search"><input name="q" defaultValue={q} placeholder="Search teams" /><button type="submit">SEARCH</button></form><div className="competition-list">{teams.map((team) => <Link className="competition-card" href={`/teams/${team.id}`} key={team.id}><span>TEAM</span><h2>{team.name}</h2><small>View recent form and roster ↗</small></Link>)}</div>{!teams.length && <p className="empty">No teams found.</p>}</main>;
}
