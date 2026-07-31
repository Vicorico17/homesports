import { getMatches } from "@/lib/matches";

export async function GET() {
  return Response.json(await getMatches());
}
