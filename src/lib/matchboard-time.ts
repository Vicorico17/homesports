import type { MatchStatus } from "./matches";

// SSR and the first client render must use the same locale and timezone.
// Device-local formatting is enabled only after the client clock starts.
export function timeLabel(value: string, status: MatchStatus, local = false) {
  if (status === "running") return "LIVE NOW";
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return "DATE TBD";
  const options: Intl.DateTimeFormatOptions = status === "finished"
    ? { month: "short", day: "numeric" }
    : { weekday: "short", hour: "2-digit", minute: "2-digit" };
  return date.toLocaleString(local ? undefined : "en-US", {
    ...options, ...(local ? {} : { timeZone: "UTC" }),
  }) + (local ? "" : " UTC");
}

export function updatedTimeLabel(value: string, local = false) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return "TIME TBD";
  return date.toLocaleTimeString(local ? undefined : "en-US", {
    hour: "2-digit", minute: "2-digit", ...(local ? {} : { timeZone: "UTC" }),
  }) + (local ? "" : " UTC");
}

export function startsIn(value: string, now: number | null) {
  const timestamp = new Date(value).getTime();
  if (!value || !Number.isFinite(timestamp)) return "TBD";
  // Cached HTML can be minutes old: don't render a countdown until hydrated.
  if (now === null) return "—";
  const minutes = Math.max(0, Math.ceil((timestamp - now) / 60_000));
  if (minutes < 60) return `${minutes}M`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H ${minutes % 60}M`;
  return `${Math.floor(hours / 24)}D ${hours % 24}H`;
}
