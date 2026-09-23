import { buildTeamCalendar, type CalendarMatch } from "@/lib/calendar";
import { getMatches } from "@/lib/matches";

export const revalidate = 300;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response("Invalid team ID.", { status: 400 });
  const feed = await getMatches();
  if (feed.demo) return new Response("Calendar data is temporarily unavailable.", { status: 503 });
  const teamMatches = feed.matches.filter(match => match.status !== "finished" && match.opponents.some(team => String(team.id) === id));
  const teamName = teamMatches.flatMap(match => match.opponents).find(team => String(team.id) === id)?.name ?? `Team ${id}`;
  const upcoming: CalendarMatch[] = teamMatches.map(match => ({ id: match.id, begin_at: match.beginAt, name: match.name, league: { name: match.league }, tournament: { name: match.tournament }, opponents: match.opponents.map(team => ({ opponent: { name: team.name } })) }));
  const origin = new URL(request.url).origin;
  const calendar = buildTeamCalendar(teamName, upcoming, origin);
  return new Response(calendar, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="homesports-team-${id}.ics"`, "Cache-Control": "public, max-age=300" } });
}
