import { getMatches } from "@/lib/matches";

export async function GET() {
  return Response.json(await getMatches(true), {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15" }
  });
}
