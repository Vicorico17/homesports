import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { panda } from "@/lib/pandascore";
import { normalizeMatch } from "@/lib/matches";
import { isMatchGame, predictionCutoff, recentForm, formWinChances, type FormMatch } from "@/lib/match-preview";
import { MatchPreview } from "@/components/match-preview";

export const revalidate = 60;
export const metadata: Metadata = { title: "Match preview", description: "Teams, recent series results, and form-based win estimates.", robots: { index: false } };

export default async function MatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ game?: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const game = (await searchParams).game === "valorant" ? "valorant" : "lol";
  const raw = await panda<FormMatch>(`matches/${id}`);
  if (!raw || raw.id !== Number(id) || !isMatchGame(raw, game)) return <main className="match-preview-page"><Link href={game === "valorant" ? "/valorant" : "/"}>← Back to matches</Link><h1>Match unavailable</h1><p>The provider could not load this match. Please try again shortly.</p></main>;
  const match = normalizeMatch(raw, raw.status === "finished" ? "finished" : raw.status === "running" ? "running" : "upcoming", game);
  const canEstimate = ["not_started", "running"].includes(raw.status) && match.opponents.length === 2 && match.opponents.every(team => team.id != null);
  const histories = canEstimate ? await Promise.all(match.opponents.map(team => panda<FormMatch[]>(`teams/${team.id}/matches?filter[status]=finished&sort=-end_at&per_page=100`, 300))) : [];
  const cutoff = predictionCutoff(match.beginAt);
  const forms = match.opponents.map((team, index) => recentForm(Array.isArray(histories[index]) ? histories[index]! : [], team.id ?? -1, game, cutoff, match.id));
  const chances = canEstimate && forms.length === 2 ? formWinChances(forms[0], forms[1]) : null;
  return <MatchPreview match={match} game={game} forms={forms} chances={chances} sourceStatus={raw.status} />;
}
