import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ValorantCompetition, type ValorantStanding } from "@/components/valorant-competition";
import { getMatches, normalizeMatch, type PandaMatch } from "@/lib/matches";
import { deriveStandings, numericStat } from "@/lib/standings";
import { panda } from "@/lib/pandascore";
import type { BracketMatch } from "@/lib/bracket";

type Tournament = { name?: string; image_url?: string | null; league?: { name?: string }; videogame?: { slug?: string } };
type Standing = { rank?: number; team?: { id?: number; name?: string; image_url?: string | null }; wins?: number; losses?: number; points?: number; score?: number };

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Valorant tournament", robots: { index: false } };
  const tournament = await panda<Tournament>(`tournaments/${id}`, 300);
  const name = tournament?.videogame?.slug === "valorant" ? tournament.name : undefined;
  return { title: name ? `${name} Valorant` : "Valorant tournament", description: name ? `${name} Valorant schedule, standings, results, and bracket.` : "Valorant tournament scores and standings on HomeSports.", alternates: { canonical: `/valorant/competition/${id}` } };
}

export default async function ValorantTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [tournamentData, standingsData, matchesData, bracketData, feed] = await Promise.all([
    panda<Tournament>(`tournaments/${id}`, 300),
    panda<Standing[]>(`tournaments/${id}/standings?per_page=100`, 60),
    panda<PandaMatch[]>(`tournaments/${id}/matches?per_page=100&sort=-begin_at`, 60),
    panda<BracketMatch[]>(`tournaments/${id}/brackets`, 60),
    getMatches("valorant"),
  ]);
  const local = feed.matches.filter(match => String(match.tournamentId) === id);
  const tournament = tournamentData?.videogame?.slug === "valorant" || !tournamentData?.videogame?.slug ? tournamentData : null;
  if (!tournament && !local.length) notFound();
  const source = local[0];
  const matches = matchesData?.filter(match => match.videogame?.slug === "valorant" || !match.videogame?.slug).map(match => normalizeMatch(match, match.status === "running" ? "running" : match.status === "finished" ? "finished" : "upcoming", "valorant")) ?? local;
  const derived = deriveStandings(matchesData ?? []);
  const rows: ValorantStanding[] = standingsData?.length ? standingsData.map((row, index) => ({ rank: row.rank ?? index + 1, team: row.team ?? {}, wins: numericStat(row.wins), losses: numericStat(row.losses), points: numericStat(row.points ?? row.score) })) : derived.map((row, index) => ({ rank: index + 1, team: row.team, wins: row.wins, losses: row.losses }));
  return <ValorantCompetition title={tournament?.name ?? source?.tournament ?? "Valorant tournament"} league={tournament?.league?.name ?? source?.league ?? "Valorant"} logo={tournament?.image_url ?? source?.tournamentImageUrl} standings={rows} matches={matches} bracket={Array.isArray(bracketData) ? bracketData : []} kind="tournament" />;
}
