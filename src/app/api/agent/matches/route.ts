export const preferredRegion = "iad1";

import { getMatches } from "@/lib/matches";
import { agentMatchesResponse } from "@/lib/agent-access";

export async function GET(request: Request) {
  return agentMatchesResponse(request, getMatches);
}
