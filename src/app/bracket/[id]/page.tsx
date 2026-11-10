import { panda } from "@/lib/pandascore";
import { notFound } from "next/navigation";
import { PlayoffBracket } from "@/components/playoff-bracket";
import { type BracketMatch } from "@/lib/bracket";
import Link from "next/link";
import { getMatches } from "@/lib/matches";
import { getLeaguepediaCompetition } from "@/lib/leaguepedia";
import { isVerifiedPlayoffMatch } from "@/lib/data-quality";

import { numericStat } from "@/lib/standings";

export const revalidate = 60;

// Generate on first visit, then reuse the complete route through ISR.
export function generateStaticParams() { return []; }


export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const { matches: feedMatches } = await getMatches();
  const localMatch = feedMatches.find((match) => String(match.tournamentId) === id);
  const [bracket, tournament] = await Promise.all([
    panda<BracketMatch[]>(`tournaments/${id}/brackets`),
    panda<{ name?: string; league?: { name?: string } }>(`tournaments/${id}`, 300),
  ]);
  const pandaMatches = bracket ?? [];
  const leaguepedia = await getLeaguepediaCompetition([localMatch?.tournament ?? "", localMatch?.serie ?? "", tournament?.name ?? ""]);
  const wikiMatches: BracketMatch[] = (leaguepedia?.matches ?? []).filter(isVerifiedPlayoffMatch).map((match, index) => ({ id: index + 1, name: [match.Phase, match.Round].filter(Boolean).join(" ") || "Playoffs", status: match.Winner ? "finished" : "not_started", scheduled_at: match.DateTime_UTC ?? null, opponents: [{ opponent: { name: match.Team1 } }, { opponent: { name: match.Team2 } }], results: match.Winner ? [{ score: numericStat(match.Team1Final ?? match.Team1Score) }, { score: numericStat(match.Team2Final ?? match.Team2Score) }] : [] }));
  const matches = pandaMatches.length ? pandaMatches : wikiMatches;

  return <main className="bracket-page"><Link href={`/competition/${id}`}>← Back to competition</Link><p className="eyebrow">TOURNAMENT BRACKET</p><h1>Playoff path</h1><PlayoffBracket matches={matches} matchPreviews={pandaMatches.length > 0} /></main>;
}
