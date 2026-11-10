import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/agent-access";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/", "/api/agent/"], disallow: ["/api/", "/login"] }, sitemap: `${siteOrigin()}/sitemap.xml` };
}
