import type { MetadataRoute } from "next";
import { getMatches } from "@/lib/matches";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homesports.vercel.app";
  const feed = await getMatches();
  const dynamic = feed.demo ? [] : feed.matches.flatMap(match => [
    `/competition/${match.tournamentId}`,
    ...(match.serieId ? [`/competition/series/${match.serieId}`] : []),
    ...match.opponents.flatMap(team => team.id != null ? [`/teams/${team.id}`] : []),
  ]);
  return [...new Set(["", "/live", "/results", "/calendar", "/worlds", "/preselect-twitch-extension", "/privacy", ...dynamic])].map((path) => ({ url: `${base}${path}`, changeFrequency: path === "" || path === "/live" ? "hourly" : "daily" }));
}
