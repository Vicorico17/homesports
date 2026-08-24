import { getMatches } from "@/lib/matches";
import { Matchboard } from "@/components/matchboard";

export const revalidate = 30;

export default async function LivePage() {
  const data = await getMatches();
  return <main><Matchboard {...data} view="running" /></main>;
}
