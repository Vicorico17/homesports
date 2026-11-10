import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { panda, pandaResult } from "@/lib/pandascore";
import { normalizeMatch } from "@/lib/matches";
import { enrichMatchStreams } from "@/lib/stream-fallbacks";
import { isMatchGame, predictionCutoff, recentForm, formWinChances, type FormMatch } from "@/lib/match-preview";
import { tournamentRoster } from "@/lib/roster-integrity";
import { MatchPreview } from "@/components/match-preview";

export const revalidate = 60;
const loadMatch = cache((id: string) => panda<FormMatch>(`matches/${id}`));

export async function generateMetadata({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ game?: string }> }): Promise<Metadata> {
  const { id } = await params;
  const game = (await searchParams).game === "valorant" ? "valorant" : "lol";
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) return { title: "Match unavailable", robots: { index: false } };
  const raw = await loadMatch(id);
  const available = raw?.id === Number(id) && isMatchGame(raw, game);
  const teams = available ? raw.opponents?.map(item => item.opponent?.name).filter(Boolean).join(" vs ") : null;
  return { title: teams || "Match preview", description: "Teams, provider status, recent form, and tournament squads. Data availability and freshness vary.", alternates: { canonical: `/match/${id}?game=${game}` }, robots: { index: available } };
}

export default async function MatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ game?: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const game = (await searchParams).game === "valorant" ? "valorant" : "lol";
  const raw = await loadMatch(id);
  if (!raw || raw.id !== Number(id) || !isMatchGame(raw, game)) return <main className="match-preview-page"><Link href={game === "valorant" ? "/valorant" : "/"}>← Back to matches</Link><h1>Match unavailable</h1><p>The provider could not load this match. Please try again shortly.</p></main>;
  const [match] = await enrichMatchStreams([normalizeMatch(raw, raw.status === "finished" ? "finished" : raw.status === "running" ? "running" : "upcoming", game)], game);
  const canEstimate = ["not_started", "running"].includes(raw.status) && match.opponents.length === 2 && match.opponents.every(team => team.id != null);
  const [histories, rosterResponse] = await Promise.all([
    canEstimate ? Promise.all(match.opponents.map(team => panda<FormMatch[]>(`teams/${team.id}/matches?filter[status]=finished&sort=-end_at&per_page=100`, 300))) : Promise.resolve([]),
    match.tournamentId > 0 ? pandaResult<unknown>(`tournaments/${match.tournamentId}/rosters`, 300) : Promise.resolve(null),
  ]);
  const rosters = match.opponents.map(team => tournamentRoster(rosterResponse?.data, team.id ?? -1, game, rosterResponse?.sourceDate));
  const cutoff = predictionCutoff(match.beginAt);
  const forms = match.opponents.map((team, index) => recentForm(Array.isArray(histories[index]) ? histories[index]! : [], team.id ?? -1, game, cutoff, match.id));
  const chances = canEstimate && forms.length === 2 ? formWinChances(forms[0], forms[1]) : null;
  return <MatchPreview match={match} game={game} forms={forms} chances={chances} sourceStatus={raw.status} rosters={rosters} />;
}
