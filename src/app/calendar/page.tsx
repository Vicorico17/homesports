import Link from "next/link";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;

export default async function CalendarPage() {
  const { matches } = await getMatches();
  const upcoming = matches.filter((match) => match.status === "upcoming");
  const days = Object.entries(Object.groupBy(upcoming, (match) => new Date(match.beginAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })));
  return <main className="calendar-page"><header><Link href="/">← Match board</Link><span>HOME<span>SPORTS</span> CALENDAR</span></header><h1>Upcoming matches</h1>{days.map(([day, dayMatches]) => <section key={day}><h2>{day}</h2>{dayMatches?.map((match) => <article key={match.id}><time>{new Date(match.beginAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time><b>{match.opponents.map((team) => team.name).join(" vs ")}</b><span>{match.league} · BO{match.bestOf}</span></article>)}</section>)}</main>;
}
