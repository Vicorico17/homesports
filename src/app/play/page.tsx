import type { Metadata } from "next";
import { ChallengeArcade } from "@/components/challenge-arcade";

export const metadata: Metadata = {
  title: "Daily LoL Games",
  description: "Guess the champion, solve a scramble, and match champion pairs. Free daily League of Legends mini-games on HomeSports.",
  alternates: { canonical: "/play" },
};
export default function PlayPage() { return <ChallengeArcade />; }
