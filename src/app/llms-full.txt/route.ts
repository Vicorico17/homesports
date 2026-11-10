import { agentGuide } from "@/lib/agent-guide";

export const dynamic = "force-static";

export function GET() {
  return new Response(agentGuide(), { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, s-maxage=3600",
    "Link": '</api/agent/site>; rel="describedby"; type="application/json"',
    "X-Content-Type-Options": "nosniff",
  } });
}
