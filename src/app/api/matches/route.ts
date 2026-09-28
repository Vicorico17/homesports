import { getMatches } from "@/lib/matches";

export async function GET(request: Request) {
  const game = new URL(request.url).searchParams.get("game") === "valorant" ? "valorant" : "lol";
  return Response.json(await getMatches(game), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" }
  });
}
