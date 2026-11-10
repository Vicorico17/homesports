import { agentDiscovery } from "@/lib/agent-guide";

export const dynamic = "force-static";

export function GET() {
  return new Response(agentDiscovery(), { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, s-maxage=3600",
    "X-Content-Type-Options": "nosniff",
  } });
}
