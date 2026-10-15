import type { Metadata } from "next";
import { getWorldsData } from "@/lib/worlds-feed";
import { WorldsHub } from "@/components/worlds-hub";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Worlds 2026 schedule and stages",
  description: "Follow verified Worlds 2026 League of Legends fixtures, Swiss records, knockout matches, and watch links in your local time.",
  alternates: { canonical: "/worlds" },
  openGraph: { title: "Worlds 2026 — HomeSports", description: "Confirmed Worlds 2026 fixtures, Swiss records, knockout matches, and watch links.", url: "/worlds" },
};

export default async function WorldsPage() {
  const feed = await getWorldsData();
  return <WorldsHub matches={feed.matches} brackets={feed.brackets} updatedAt={feed.updatedAt} sourceStatus={feed.sourceStatus} />;
}
