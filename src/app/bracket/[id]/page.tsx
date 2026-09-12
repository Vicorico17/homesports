import { PlayoffBracket } from "@/components/playoff-bracket";
import { type BracketMatch } from "@/lib/bracket";
import Link from "next/link";
import { getMatches } from "@/lib/matches";
import { getLeaguepediaCompetition } from "@/lib/leaguepedia";
import { isVerifiedPlayoffMatch } from "@/lib/data-quality";

export const revalidate = 60;


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
  const wikiMatches: BracketMatch[] = (leaguepedia?.matches ?? []).filter(isVerifiedPlayoffMatch).map((match, index) => ({ id: index + 1, name: [match.Phase, match.Round].filter(Boolean).join(" ") || "Playoffs", status: match.Winner ? "finished" : "not_started", scheduled_at: match.DateTime_UTC ?? null, opponents: [{ opponent: { name: match.Team1 } }, { opponent: { name: match.Team2 } }], results: match.Winner ? [{ score: Number(match.Team1Final ?? match.Team1Score) || 0 }, { score: Number(match.Team2Final ?? match.Team2Score) || 0 }] : [] }));
  const matches = pandaMatches.length ? pandaMatches : wikiMatches;

  return <main className="bracket-page"><Link href={`/competition/${id}`}>← Back to competition</Link><p className="eyebrow">TOURNAMENT BRACKET</p><h1>Playoff path</h1><PlayoffBracket matches={matches} /></main>;
}
