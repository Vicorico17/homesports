import Link from "next/link";

type BracketMatch = { id: number; name?: string; status: string; scheduled_at: string | null; opponents: { opponent?: { name?: string } }[]; results: { score: number }[] };
export const revalidate = 60;

export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const token = process.env.PANDASCORE_API_KEY; const response = token ? await fetch(`https://api.pandascore.co/tournaments/${id}/brackets`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }) : null; const matches = response?.ok ? await response.json() as BracketMatch[] : [];
  const grouped = new Map<string, BracketMatch[]>(); matches.forEach((match) => { const round = match.name?.split(":")[0] || "Bracket"; grouped.set(round, [...(grouped.get(round) ?? []), match]); }); const rounds = [...grouped.entries()];
  return <main className="bracket-page"><Link href={`/competition/${id}`}>← Back to competition</Link><p className="eyebrow">TOURNAMENT BRACKET</p><h1>Playoff path</h1>{rounds.length ? <div className="bracket-board">{rounds.map(([round, roundMatches], roundIndex) => <section className="bracket-column" key={round}><h2>{round}</h2><div className="bracket-matches">{roundMatches.map((match) => <article className={`bracket-match ${roundIndex > 0 ? "bracket-later-round" : ""}`} key={match.id}><small>{match.status === "running" ? "LIVE" : match.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "TBD"}</small>{[0, 1].map((index) => <div className="bracket-team" key={index}>{match.opponents[index]?.opponent?.name ?? "TBD"}<b>{match.results[index]?.score ?? ""}</b></div>)}</article>)}</div></section>)}</div> : <p>No bracket is available yet for this tournament.</p>}</main>;
}
