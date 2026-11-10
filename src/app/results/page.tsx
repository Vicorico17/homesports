import { pageMetadata } from "@/lib/site-discovery";
import { getMatches } from "@/lib/matches";
import { Matchboard } from "@/components/matchboard";

export const revalidate = 60;

export const metadata = pageMetadata("/results");

export default async function ResultsPage() {
  const data = await getMatches();
  return <main><Matchboard {...data} view="finished" /></main>;
}
