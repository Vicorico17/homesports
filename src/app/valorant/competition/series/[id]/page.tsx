import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ValorantCompetition, type ValorantStanding } from "@/components/valorant-competition";
import { getMatches, normalizeMatch, type PandaMatch } from "@/lib/matches";
import { deriveStandings } from "@/lib/standings";
import { panda } from "@/lib/pandascore";
import type { BracketMatch } from "@/lib/bracket";

type Serie = { full_name?: string; name?: string; videogame?: { slug?: string }; league?: { name?: string; image_url?: string | null } };
type Tournament = { id: number; name?: string; has_bracket?: boolean };

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Valorant season", robots: { index: false } };
  const serie = await panda<Serie>(`series/${id}`, 300);
  const name = serie?.videogame?.slug === "valorant" ? serie.full_name ?? serie.name : undefined;
  return { title: name ? `${name} Valorant` : "Valorant season", description: name ? `${name} Valorant schedule, standings, results, and playoffs.` : "Valorant season scores and standings on HomeSports.", alternates: { canonical: `/valorant/competition/series/${id}` } };
}

export default async function ValorantSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [serieData, matchesData, tournamentsData, feed] = await Promise.all([
    panda<Serie>(`series/${id}`, 300),
    panda<PandaMatch[]>(`series/${id}/matches?per_page=100&sort=-begin_at`, 60),
    panda<Tournament[]>(`series/${id}/tournaments?per_page=100`, 300),
    getMatches("valorant"),
  ]);
  const local = feed.matches.filter(match => String(match.serieId) === id);
  const serie = serieData?.videogame?.slug === "valorant" || !serieData?.videogame?.slug ? serieData : null;
  if (!serie && !local.length) notFound();
  const source = local[0];
  const raw = (matchesData ?? []).filter(match => match.videogame?.slug === "valorant" || !match.videogame?.slug);
  const matches = raw.length ? raw.map(match => normalizeMatch(match, match.status === "running" ? "running" : match.status === "finished" ? "finished" : "upcoming", "valorant")) : local;
  const tournament = (tournamentsData ?? []).find(item => item.has_bracket && /playoff|knockout|final/i.test(item.name ?? "")) ?? (tournamentsData ?? []).find(item => item.has_bracket);
  const bracket = tournament ? await panda<BracketMatch[]>(`tournaments/${tournament.id}/brackets`, 60) : null;
  const standingMatches = raw.length ? raw : local.map(match => ({ id: match.id, status: match.status, tournament: { name: match.tournament }, opponents: match.opponents.map(team => ({ opponent: { id: team.id, name: team.name, image_url: team.imageUrl } })), results: match.opponents.map(team => ({ team_id: team.id, score: team.score })) }));
  const derived = deriveStandings(standingMatches.filter(match => !/playoff|knockout|final/i.test(match.tournament?.name ?? "")));
  const rows: ValorantStanding[] = derived.map((row, index) => ({ rank: index + 1, team: row.team, wins: row.wins, losses: row.losses }));
  return <ValorantCompetition title={serie?.full_name ?? serie?.name ?? source?.serie ?? "Valorant season"} league={serie?.league?.name ?? source?.league ?? "Valorant"} logo={serie?.league?.image_url ?? source?.leagueImageUrl} standings={rows} matches={matches} bracket={Array.isArray(bracket) ? bracket : []} kind="season" />;
}
