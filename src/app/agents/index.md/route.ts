import { agentGuide } from "@/lib/agent-guide";

export const dynamic = "force-static";

export function GET() {
  return new Response(agentGuide(), { headers: {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, s-maxage=3600",
    "Link": '</llms.txt>; rel="describedby"',
    "X-Content-Type-Options": "nosniff",
  } });
}
