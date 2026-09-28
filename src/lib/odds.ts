import type { Game } from "./game.ts";
import type { Match } from "./matches.ts";

export type OddsEvent = {
  id: number;
  home: string;
  away: string;
  date: string;
  league?: { name?: string; slug?: string };
};

const normal = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function sameTeam(a: string, b: string) {
  const left = normal(a);
  const right = normal(b);
  return left === right || (Math.min(left.length, right.length) >= 4 && (left.includes(right) || right.includes(left)));
}

export function eventGame(event: OddsEvent): Game | null {
  const league = `${event.league?.name ?? ""} ${event.league?.slug ?? ""}`.toLowerCase();
  if (/valorant|\bvct\b|challengers.*valorant|game changers/.test(league)) return "valorant";
  if (/league of legends|\blol\b|\blck\b|\blpl\b|\blec\b|\blcs\b|\blta\b|\blcp\b|\bmsi\b/.test(league)) return "lol";
  return null;
}

export function matchOddsEvent(match: Match, event: OddsEvent, game: Game): "same" | "reversed" | null {
  if (eventGame(event) !== game || match.opponents.length !== 2 || !match.beginAt) return null;
  const start = Date.parse(match.beginAt);
  const eventStart = Date.parse(event.date);
  if (!Number.isFinite(start) || !Number.isFinite(eventStart) || Math.abs(start - eventStart) > 12 * 60 * 60 * 1000) return null;
  const [home, away] = match.opponents;
  if (sameTeam(home.name, event.home) && sameTeam(away.name, event.away)) return "same";
  if (sameTeam(home.name, event.away) && sameTeam(away.name, event.home)) return "reversed";
  return null;
}

export type OddsMarket = { name: string; updatedAt?: string; odds?: { home?: string; away?: string }[] };
export type OddsResult = { id: number; bookmakers?: Record<string, OddsMarket[]> };

export function marketAverage(result: OddsResult, orientation: "same" | "reversed") {
  const prices = Object.values(result.bookmakers ?? {}).flatMap((markets) => {
    const market = markets.find((item) => item.name === "ML");
    const raw = market?.odds?.[0];
    const home = Number(raw?.home);
    const away = Number(raw?.away);
    return Number.isFinite(home) && home > 1 && Number.isFinite(away) && away > 1
      ? [{ home: orientation === "same" ? home : away, away: orientation === "same" ? away : home, updatedAt: market?.updatedAt }]
      : [];
  });
  if (!prices.length) return null;
  const average = (side: "home" | "away") => prices.reduce((sum, price) => sum + price[side], 0) / prices.length;
  return { bookmaker: "Market average", home: average("home"), away: average("away"), updatedAt: prices.map((price) => price.updatedAt).filter(Boolean).sort().at(-1) };
}
