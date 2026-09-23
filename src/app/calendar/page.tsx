import { getMatches } from "@/lib/matches";
import { CalendarGrid } from "@/components/calendar-grid";

export const revalidate = 60;

export default async function CalendarPage() {
  const { matches } = await getMatches();
  return <CalendarGrid matches={matches} generatedAt={new Date().toISOString()} />;
}
