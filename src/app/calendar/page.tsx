import Link from "next/link";
import { getMatches } from "@/lib/matches";

export const revalidate = 60;

export default async function CalendarPage() {
  const { matches } = await getMatches();
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
  const first = new Date(year, month, 1); const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: offset + days }, (_, index) => index < offset ? null : index - offset + 1);
  return <main className="calendar-page"><header><Link href="/">← Match board</Link><span>HOME<span>SPORTS</span> CALENDAR</span></header><h1>{now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h1><div className="calendar-week">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => <b key={day}>{day}</b>)}</div><div className="calendar-grid">{cells.map((day, index) => <section className={day === now.getDate() ? "today" : ""} key={index}>{day && <><strong>{day}</strong>{matches.filter((match) => match.status !== "finished" && new Date(match.beginAt).getDate() === day && new Date(match.beginAt).getMonth() === month).map((match) => <article key={match.id}><time>{new Date(match.beginAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time>{match.opponents.map((team) => team.name).join(" vs ")}</article>)}</>}</section>)}</div></main>;
}
