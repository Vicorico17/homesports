import { pageMetadata } from "@/lib/site-discovery";
import { Matchboard } from "@/components/matchboard";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;

export const metadata = pageMetadata("/valorant");

export default async function ValorantPage() {
  return <main><Matchboard {...await getMatches("valorant")} /></main>;
}
