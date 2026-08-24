import Link from "next/link";

type BracketMatch = { id: number; name?: string; status: string; scheduled_at: string | null; opponents: { opponent?: { name?: string; image_url?: string | null } }[]; results: { score: number }[] };
export const revalidate = 60;

function roundLabel(match: BracketMatch) { return match.name?.split(":")[0]?.trim() || "Bracket"; }
function roundRank(label: string) { const value = label.toLowerCase(); if (value.includes("quarter")) return 10; if (value.includes("semi")) return 20; if (value.includes("final")) return 30; const number = value.match(/\d+/); return number ? Number(number[0]) : 50; }

export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = process.env.PANDASCORE_API_KEY;
  const response = token ? await fetch(`https://api.pandascore.co/tournaments/${id}/brackets`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }) : null;
  const matches = response?.ok ? await response.json() as BracketMatch[] : [];
  const grouped = new Map<string, BracketMatch[]>();
  matches.forEach((match) => { const round = roundLabel(match); grouped.set(round, [...(grouped.get(round) ?? []), match]); });
  const rounds = [...grouped.entries()].sort(([a, aMatches], [b, bMatches]) => { const aDate = Math.min(...aMatches.map((match) => match.scheduled_at ? Date.parse(match.scheduled_at) : Number.POSITIVE_INFINITY)); const bDate = Math.min(...bMatches.map((match) => match.scheduled_at ? Date.parse(match.scheduled_at) : Number.POSITIVE_INFINITY)); return Number.isFinite(aDate) || Number.isFinite(bDate) ? aDate - bDate : roundRank(a) - roundRank(b); });
  const slots = Math.max(...rounds.map(([, roundMatches]) => roundMatches.length), 1);

  return <main className="bracket-page"><Link href={`/competition/${id}`}>← Back to competition</Link><p className="eyebrow">TOURNAMENT BRACKET</p><h1>Playoff path</h1>{rounds.length ? <div className="bracket-board">{rounds.map(([round, roundMatches], roundIndex) => <section className="bracket-column" key={round}><h2>{round}</h2><div className="bracket-matches" style={{ gridTemplateRows: `repeat(${slots}, minmax(82px, auto))` }}>{roundMatches.map((match, matchIndex) => { const span = 2 ** roundIndex; const row = matchIndex * span + 1; return <article className={`bracket-match ${roundIndex > 0 ? "bracket-later-round" : ""}`} style={{ gridRow: `${row} / span ${span}` }} key={match.id}><small>{match.status === "running" ? "LIVE" : match.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "TBD"}</small>{[0, 1].map((index) => <div className="bracket-team" key={index}>{match.opponents[index]?.opponent?.image_url ? <img src={match.opponents[index].opponent.image_url} alt="" /> : <i>{(match.opponents[index]?.opponent?.name ?? "T").slice(0, 1)}</i>}<span>{match.opponents[index]?.opponent?.name ?? "TBD"}</span><b>{match.results[index]?.score ?? ""}</b></div>)}</article>; })}</div></section>)}</div> : <p>No bracket is available yet for this tournament.</p>}</main>;
}
