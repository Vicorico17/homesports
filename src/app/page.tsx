import { getMatches } from "@/lib/matches";
import { Matchboard } from "@/components/matchboard";

export const revalidate = 30;

export default async function Home() {
  const data = await getMatches();
  return <main><Matchboard {...data} /></main>;
}
