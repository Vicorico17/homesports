import type { Metadata } from "next";
import { CalendarGrid } from "@/components/calendar-grid";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;
export const metadata: Metadata = { title: "Valorant match calendar", description: "Upcoming Valorant esports matches in your timezone.", alternates: { canonical: "/valorant/calendar" } };

export default async function ValorantCalendarPage() {
  const { matches } = await getMatches("valorant");
  return <CalendarGrid matches={matches} generatedAt={new Date().toISOString()} game="valorant" />;
}
