import { getMatches } from "@/lib/matches";
import { getWorldsData } from "@/lib/worlds-feed";
import { Matchboard } from "@/components/matchboard";

export const revalidate = 30;

export default async function Home() {
  const data = await getMatches();
  const worlds = await getWorldsData(data);
  return <main><Matchboard {...data} worlds={worlds} view="all" /></main>;
}
