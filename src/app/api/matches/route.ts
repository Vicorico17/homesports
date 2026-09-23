import { getMatches } from "@/lib/matches";

export async function GET() {
  return Response.json(await getMatches(), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" }
  });
}
