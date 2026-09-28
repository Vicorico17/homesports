import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayoffBracket } from "@/components/playoff-bracket";
import { panda } from "@/lib/pandascore";
import type { BracketMatch } from "@/lib/bracket";

type Tournament = { name?: string; videogame?: { slug?: string } };

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: "Valorant playoff bracket", description: "Published Valorant tournament bracket and match scores.", alternates: { canonical: `/valorant/bracket/${id}` } };
}

export default async function ValorantBracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [tournament, matches] = await Promise.all([panda<Tournament>(`tournaments/${id}`, 300), panda<BracketMatch[]>(`tournaments/${id}/brackets`, 60)]);
  if (tournament?.videogame?.slug && tournament.videogame.slug !== "valorant") notFound();
  return <main className="bracket-page"><Link href={`/valorant/competition/${id}`}>← Back to tournament</Link><p className="eyebrow">VALORANT BRACKET</p><h1>{tournament?.name ?? "Playoff path"}</h1><PlayoffBracket matches={Array.isArray(matches) ? matches : []} /></main>;
}
