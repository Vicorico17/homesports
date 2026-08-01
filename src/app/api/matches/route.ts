import { getMatches } from "@/lib/matches";

export async function GET() {
  return Response.json(await getMatches(true), { headers: { "Cache-Control": "no-store" } });
}
