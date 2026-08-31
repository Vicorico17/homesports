import { validDate } from "./data-quality.ts";

export type CalendarMatch = { id: number; begin_at?: string | null; name?: string; league?: { name?: string }; tournament?: { name?: string }; opponents?: { opponent?: { name?: string } }[] };

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildTeamCalendar(teamName: string, matches: CalendarMatch[], origin: string) {
  const events = matches.filter((match) => validDate(match.begin_at)).map((match) => {
    const start = new Date(match.begin_at as string);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const opponents = (match.opponents ?? []).map((entry) => entry.opponent?.name).filter(Boolean).join(" vs ") || match.name || teamName;
    const competition = match.league?.name ?? match.tournament?.name ?? "League of Legends esports";
    return [
      "BEGIN:VEVENT",
      `UID:homesports-match-${match.id}@homesports`,
      `DTSTAMP:${icsDate(new Date(0))}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${escapeIcs(opponents)}`,
      `DESCRIPTION:${escapeIcs(`${competition} — schedule automatically provided by HomeSports.`)}`,
      `URL:${origin}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HomeSports//Team Schedule//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escapeIcs(`${teamName} — HomeSports`)}`, ...events, "END:VCALENDAR", ""].join("\r\n");
}
