import Link from "next/link";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;

export default async function CompetitionsPage() {
  const { matches } = await getMatches();
  const competitions = [...new Map(matches.map((match) => [match.tournamentId, match])).values()]
    .sort((a, b) => new Date(b.beginAt).getTime() - new Date(a.beginAt).getTime());
  return <main className="competition-page"><Link href="/">← Back to matches</Link><p className="eyebrow">COMPETITION INDEX</p><h1>Follow the <em>race.</em></h1><p className="page-intro">Every competition is built from the same PandaScore match feed as the main board.</p><div className="competition-list">{competitions.map((competition) => <Link className="competition-card" href={`/competition/${competition.tournamentId}`} key={competition.tournamentId}>{competition.tournamentImageUrl ? <img className="competition-logo" src={competition.tournamentImageUrl} alt="" /> : <i className="competition-logo-fallback">{(competition.tournament || competition.serie || "C").slice(0, 1)}</i>}<span>{competition.league}</span><h2>{competition.tournament || competition.serie || "Competition"}</h2><small>{matches.filter((match) => match.tournamentId === competition.tournamentId && match.status === "finished").length} completed · {matches.filter((match) => match.tournamentId === competition.tournamentId && match.status === "upcoming").length} upcoming ↗</small></Link>)}</div></main>;
}
