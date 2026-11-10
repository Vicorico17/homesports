import { agentOpenApi } from "@/lib/agent-openapi";

export const dynamic = "force-static";

export function GET() {
  return Response.json(agentOpenApi(), { headers: {
    "Cache-Control": "public, s-maxage=3600",
    "Link": '</llms.txt>; rel="describedby"',
    "X-Content-Type-Options": "nosniff",
  } });
}
