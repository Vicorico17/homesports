import { pageMetadata } from "@/lib/site-discovery";
import { Matchboard } from "@/components/matchboard";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;

export const metadata = pageMetadata("/valorant/results");

export default async function ValorantResultsPage() {
  return <main><Matchboard {...await getMatches("valorant")} view="finished" /></main>;
}
