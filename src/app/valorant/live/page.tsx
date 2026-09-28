import type { Metadata } from "next";
import { Matchboard } from "@/components/matchboard";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;
export const metadata: Metadata = { title: "Live Valorant matches", description: "Follow running Valorant esports series and official stream links.", alternates: { canonical: "/valorant/live" } };

export default async function ValorantLivePage() {
  return <main><Matchboard {...await getMatches("valorant")} view="running" /></main>;
}
