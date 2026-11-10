import { pageMetadata } from "@/lib/site-discovery";
import { Matchboard } from "@/components/matchboard";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;

export const metadata = pageMetadata("/valorant/live");

export default async function ValorantLivePage() {
  return <main><Matchboard {...await getMatches("valorant")} view="running" /></main>;
}
