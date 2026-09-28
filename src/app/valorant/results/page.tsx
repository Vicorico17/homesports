import type { Metadata } from "next";
import { Matchboard } from "@/components/matchboard";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;
export const metadata: Metadata = { title: "Valorant results", description: "Recent Valorant esports series results and team scores.", alternates: { canonical: "/valorant/results" } };

export default async function ValorantResultsPage() {
  return <main><Matchboard {...await getMatches("valorant")} view="finished" /></main>;
}
