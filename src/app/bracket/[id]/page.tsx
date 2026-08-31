import Link from "next/link";
import { getMatches } from "@/lib/matches";
import { getLeaguepediaCompetition } from "@/lib/leaguepedia";
import { isVerifiedPlayoffMatch } from "@/lib/data-quality";

type BracketMatch = { id: number; name?: string; status: string; scheduled_at: string | null; opponents: { opponent?: { name?: string; image_url?: string | null } }[]; results: { score: number }[]; previous_matches?: { type?: string; match_id?: number }[] };
export const revalidate = 60;

function roundLabel(match: BracketMatch) { const label = match.name?.split(":")[0]?.trim() || "Bracket"; return label.replace(/\s+match\s+\d+$/i, "").replace(/\s+\d+$/, ""); }
function roundRank(label: string) { const value = label.toLowerCase(); if (value.includes("quarter")) return 10; if (value.includes("semi")) return 20; if (value.includes("final")) return 30; const number = value.match(/\d+/); return number ? Number(number[0]) : 50; }
function teamLabel(match: BracketMatch, index: number) { const name = match.opponents[index]?.opponent?.name; if (name) return name; const previous = match.previous_matches?.[index]; return previous?.match_id ? `${previous.type === "loser" ? "Loser" : "Winner"} of #${previous.match_id}` : "TBD"; }

export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = process.env.PANDASCORE_API_KEY;
  const { matches: feedMatches } = await getMatches();
  const localMatch = feedMatches.find((match) => String(match.tournamentId) === id);
  const [bracketResponse, tournamentResponse] = token ? await Promise.all([
    fetch(`https://api.pandascore.co/tournaments/${id}/brackets`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }),
    fetch(`https://api.pandascore.co/tournaments/${id}`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }),
  ]) : [null, null];
  const pandaMatches = bracketResponse?.ok ? await bracketResponse.json() as BracketMatch[] : [];
  const tournament = tournamentResponse?.ok ? await tournamentResponse.json() as { name?: string; league?: { name?: string } } : null;
  const leaguepedia = await getLeaguepediaCompetition([localMatch?.tournament ?? "", localMatch?.serie ?? "", tournament?.name ?? ""]);
  const wikiMatches: BracketMatch[] = (leaguepedia?.matches ?? []).filter(isVerifiedPlayoffMatch).map((match, index) => ({ id: Number(match.MatchId?.replace(/\D/g, "")) || index + 1, name: match.Round || match.Phase || "Playoffs", status: match.Winner ? "finished" : "not_started", scheduled_at: match.DateTime_UTC ?? null, opponents: [{ opponent: { name: match.Team1 } }, { opponent: { name: match.Team2 } }], results: match.Winner ? [{ score: Number(match.Team1Final ?? match.Team1Score) || 0 }, { score: Number(match.Team2Final ?? match.Team2Score) || 0 }] : [] }));
  const matches = wikiMatches.length ? wikiMatches : pandaMatches;
  const grouped = new Map<string, BracketMatch[]>();
  matches.forEach((match) => { const round = roundLabel(match); grouped.set(round, [...(grouped.get(round) ?? []), match]); });
  const rounds = [...grouped.entries()].sort(([a, aMatches], [b, bMatches]) => { const aDate = Math.min(...aMatches.map((match) => match.scheduled_at ? Date.parse(match.scheduled_at) : Number.POSITIVE_INFINITY)); const bDate = Math.min(...bMatches.map((match) => match.scheduled_at ? Date.parse(match.scheduled_at) : Number.POSITIVE_INFINITY)); return Number.isFinite(aDate) || Number.isFinite(bDate) ? aDate - bDate : roundRank(a) - roundRank(b); });
  const slots = Math.max(...rounds.map(([, roundMatches]) => roundMatches.length), 1);

  return <main className="bracket-page"><Link href={`/competition/${id}`}>← Back to competition</Link><p className="eyebrow">TOURNAMENT BRACKET</p><h1>Playoff path</h1>{rounds.length ? <div className="bracket-board">{rounds.map(([round, roundMatches], roundIndex) => <section className="bracket-column" key={round}><h2>{round}</h2><div className="bracket-matches" style={{ gridTemplateRows: `repeat(${slots}, minmax(82px, auto))` }}>{roundMatches.map((match, matchIndex) => { const span = Math.max(1, Math.floor(slots / roundMatches.length)); const row = matchIndex * span + 1; return <article className={`bracket-match ${roundIndex > 0 ? "bracket-later-round" : ""}`} style={{ gridRow: `${row} / span ${span}` }} key={match.id}><small>{match.status === "running" ? "LIVE" : match.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "TBD"}</small>{[0, 1].map((index) => <div className="bracket-team" key={index}>{match.opponents[index]?.opponent?.image_url ? <img src={match.opponents[index].opponent.image_url} alt="" /> : <i>{teamLabel(match, index).slice(0, 1)}</i>}<span>{teamLabel(match, index)}</span><b>{match.results[index]?.score ?? ""}</b></div>)}</article>; })}</div></section>)}</div> : <p>No bracket is available yet for this tournament.</p>}</main>;
}
