import { getWorldsData } from "@/lib/worlds-feed";

export async function GET() {
  return Response.json(await getWorldsData(), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" },
  });
}
