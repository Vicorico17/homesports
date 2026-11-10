import { pageMetadata } from "@/lib/site-discovery";
import { CalendarGrid } from "@/components/calendar-grid";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;

export const metadata = pageMetadata("/valorant/calendar");

export default async function ValorantCalendarPage() {
  const { matches } = await getMatches("valorant");
  return <CalendarGrid matches={matches} generatedAt={new Date().toISOString()} game="valorant" />;
}
