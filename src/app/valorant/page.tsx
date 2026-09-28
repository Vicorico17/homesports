import type { Metadata } from "next";
import { Matchboard } from "@/components/matchboard";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;
export const metadata: Metadata = { title: "Valorant esports scores and schedule", description: "Valorant live matches, VCT schedule, results, teams, and tournaments on HomeSports.", alternates: { canonical: "/valorant" } };

export default async function ValorantPage() {
  return <main><Matchboard {...await getMatches("valorant")} /></main>;
}
