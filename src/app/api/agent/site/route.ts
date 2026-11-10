import { siteCatalog } from "@/lib/site-discovery";

export const dynamic = "force-static";

export function GET() {
  return Response.json(siteCatalog(), { headers: {
    "Cache-Control": "public, s-maxage=3600",
    "Link": '</agents/index.md>; rel="describedby"; type="text/markdown", </api/agent/openapi>; rel="service-desc"; type="application/json"',
    "X-Content-Type-Options": "nosniff",
  } });
}
