import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homesports.vercel.app";
  return ["", "/live", "/results", "/calendar", "/privacy"].map((path) => ({ url: `${base}${path}`, changeFrequency: path === "" || path === "/live" ? "hourly" : "daily" }));
}
