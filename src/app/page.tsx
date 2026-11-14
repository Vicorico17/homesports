import { pageMetadata } from "@/lib/site-discovery";
import { getMatches } from "@/lib/matches";
import { getWorldsData } from "@/lib/worlds-feed";
import { getGridFinal } from "@/lib/grid";
import { Matchboard } from "@/components/matchboard";

export const revalidate = 60;

export const metadata = pageMetadata("/");

export default async function Home() {
  const [data, final] = await Promise.all([getMatches(), getGridFinal()]);
  const worlds = await getWorldsData(data);
  return <main><Matchboard {...data} worlds={worlds} final={final} view="all" /></main>;
}
