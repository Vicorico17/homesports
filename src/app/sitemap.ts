import type { MetadataRoute } from "next";
import { getMatches } from "@/lib/matches";
import { siteOrigin } from "@/lib/agent-access";
import { discoverPagePaths } from "@/lib/site-discovery";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const feeds = await Promise.all([getMatches("lol"), getMatches("valorant")]);
  return discoverPagePaths(feeds).map(path => ({
    url: `${siteOrigin()}${path}`,
    changeFrequency: ["/", "/live", "/valorant", "/valorant/live"].includes(path) ? "hourly" : "daily",
  }));
}
