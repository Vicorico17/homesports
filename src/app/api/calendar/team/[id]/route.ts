import { buildTeamCalendar, type CalendarMatch } from "@/lib/calendar";

export const revalidate = 300;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return new Response("Calendar data is unavailable.", { status: 503 });
  const headers = { Authorization: `Bearer ${token}` };
  const [teamResponse, matchesResponse] = await Promise.all([
    fetch(`https://api.pandascore.co/teams/${id}`, { headers, next: { revalidate: 300 } }),
    fetch(`https://api.pandascore.co/teams/${id}/matches?sort=begin_at&per_page=100`, { headers, next: { revalidate: 300 } }),
  ]);
  if (!teamResponse.ok || !matchesResponse.ok) return new Response("Calendar data is temporarily unavailable.", { status: 502 });
  const team = await teamResponse.json() as { name?: string };
  const matches = await matchesResponse.json() as (CalendarMatch & { status?: string })[];
  const upcoming = matches.filter((match) => match.status === "not_started" || match.status === "running");
  const origin = new URL(request.url).origin;
  const calendar = buildTeamCalendar(team.name ?? `Team ${id}`, upcoming, origin);
  return new Response(calendar, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="homesports-team-${id}.ics"`, "Cache-Control": "public, max-age=300" } });
}
