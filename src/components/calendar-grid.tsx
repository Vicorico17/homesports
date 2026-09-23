"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Match } from "@/lib/matches";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function CalendarGrid({ matches, generatedAt }: { matches: Match[]; generatedAt: string }) {
  const local = useSyncExternalStore(subscribe, clientReady, serverReady);
  const now = local ? new Date() : new Date(generatedAt);
  const year = local ? now.getFullYear() : now.getUTCFullYear();
  const month = local ? now.getMonth() : now.getUTCMonth();
  const today = local ? now.getDate() : now.getUTCDate();
  const first = local ? new Date(year, month, 1) : new Date(Date.UTC(year, month, 1));
  const days = local ? new Date(year, month + 1, 0).getDate() : new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = ((local ? first.getDay() : first.getUTCDay()) + 6) % 7;
  const cells = Array.from({ length: offset + days }, (_, index) => index < offset ? null : index - offset + 1);
  const formatOptions: Intl.DateTimeFormatOptions = local ? { hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
  return <main className="calendar-page"><header><Link href="/">← Match board</Link><span>HOME<span>SPORTS</span> CALENDAR</span></header><h1>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: local ? undefined : "UTC" }).format(now)}</h1><p className="calendar-timezone">{local ? "Times shown in your device timezone" : "Times shown in UTC"}</p><div className="calendar-week">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => <b key={day}>{day}</b>)}</div><div className="calendar-grid">{cells.map((day, index) => <section className={day === today ? "today" : ""} key={index}>{day && <><strong>{day}</strong>{matches.filter(match => { if (match.status === "finished" || !match.beginAt || !Number.isFinite(Date.parse(match.beginAt))) return false; const date = new Date(match.beginAt); return (local ? date.getFullYear() : date.getUTCFullYear()) === year && (local ? date.getMonth() : date.getUTCMonth()) === month && (local ? date.getDate() : date.getUTCDate()) === day; }).map(match => <article key={match.id}><time dateTime={match.beginAt}>{new Intl.DateTimeFormat(undefined, formatOptions).format(new Date(match.beginAt))}{!local && " UTC"}</time><Link href={`/competition/${match.tournamentId}`}>{match.opponents.length ? match.opponents.map(team => team.name).join(" vs ") : match.name}</Link></article>)}</>}</section>)}</div></main>;
}
