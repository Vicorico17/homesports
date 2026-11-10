import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homesports.vercel.app";
  return { rules: { userAgent: "*", allow: ["/", "/api/agent/"], disallow: "/api/" }, sitemap: `${base}/sitemap.xml` };
}
