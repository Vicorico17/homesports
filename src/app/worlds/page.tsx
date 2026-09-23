import type { Metadata } from "next";
import { getMatches } from "@/lib/matches";
import { isWorlds2026Match } from "@/lib/worlds";
import { WorldsHub } from "@/components/worlds-hub";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Worlds 2026 schedule and stages",
  description: "Follow verified Worlds 2026 League of Legends fixtures, Swiss records, knockout matches, and watch links in your local time.",
  alternates: { canonical: "/worlds" },
  openGraph: { title: "Worlds 2026 — HomeSports", description: "Confirmed Worlds 2026 fixtures, Swiss records, knockout matches, and watch links.", url: "/worlds" },
};

export default async function WorldsPage() {
  const feed = await getMatches();
  return <WorldsHub matches={feed.demo ? [] : feed.matches.filter(isWorlds2026Match)} updatedAt={feed.updatedAt} sourceStatus={feed.sourceStatus} />;
}
