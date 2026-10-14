import type { MetadataRoute } from "next";
import { getMatches } from "@/lib/matches";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homesports.vercel.app";
  const feeds = await Promise.all([getMatches("lol"), getMatches("valorant")]);
  const dynamic = feeds.flatMap(feed => feed.demo ? [] : feed.matches.flatMap(match => {
    const prefix = feed.game === "valorant" ? "/valorant" : "";
    return [`${prefix}/competition/${match.tournamentId}`,
      ...(match.serieId ? [`${prefix}/competition/series/${match.serieId}`] : []),
      ...match.opponents.flatMap(team => team.id != null ? [`${prefix}/teams/${team.id}`] : []),
    ];
  }));
  return [...new Set(["", "/live", "/results", "/calendar", "/worlds", "/play", "/valorant", "/valorant/live", "/valorant/results", "/valorant/calendar", "/preselect-twitch-extension", "/privacy", ...dynamic])].map((path) => ({ url: `${base}${path}`, changeFrequency: path === "" || path === "/live" || path === "/valorant" || path === "/valorant/live" ? "hourly" : "daily" }));
}
