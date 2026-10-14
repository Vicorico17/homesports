import { Suspense } from "react";
import type { Metadata } from "next";
import { ChallengeArcade } from "@/components/challenge-arcade";

export const metadata: Metadata = {
  title: "Daily LoL Games",
  description: "Guess champions and ultimate abilities, solve scrambles, and match champion portraits. Free daily League of Legends mini-games on HomeSports.",
  alternates: { canonical: "/play" },
};
export default function PlayPage() { return <Suspense fallback={<main className="shell"><p role="status">Loading League challenges…</p></main>}><ChallengeArcade /></Suspense>; }
