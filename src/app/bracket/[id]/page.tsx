import Link from "next/link";

type BracketMatch = { id: number; name: string; status: string; scheduled_at: string | null; opponents: { opponent?: { name?: string } }[]; results: { score: number }[] };

export const revalidate = 60;

export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`https://api.pandascore.co/tournaments/${id}/brackets`, { headers: { Authorization: `Bearer ${process.env.PANDASCORE_API_KEY}` }, next: { revalidate: 60 } });
  const matches = response.ok ? await response.json() as BracketMatch[] : [];
  const rounds = Object.entries(Object.groupBy(matches, (match) => match.name.split(":")[0] || "Bracket"));
  return <main className="bracket-page"><Link href="/">← Back to matches</Link><p className="eyebrow">TOURNAMENT BRACKET</p><h1>Playoff path</h1>{rounds.length ? <div className="bracket-rounds">{rounds.map(([round, roundMatches]) => <section key={round}><h2>{round}</h2>{roundMatches?.map((match) => <article key={match.id}><small>{match.status === "running" ? "LIVE" : match.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "TBD"}</small>{match.opponents.length ? match.opponents.map(({ opponent }, index) => <div key={opponent?.name ?? index}>{opponent?.name ?? "TBD"}<b>{match.results[index]?.score ?? ""}</b></div>) : <div>TBD vs TBD</div>}</article>)}</section>)}</div> : <p>No bracket is available yet for this tournament.</p>}</main>;
}
