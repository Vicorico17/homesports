import { validDate } from "@/lib/data-quality";
import { type Game, gameName, rateValorantMatch } from "@/lib/game";
import { marketAverage, matchOddsEvent, type OddsEvent, type OddsResult } from "@/lib/odds";

export type MatchStatus = "running" | "upcoming" | "finished";

export type Match = {
  id: number;
  status: MatchStatus;
  beginAt: string;
  name: string;
  league: string;
  leagueImageUrl?: string | null;
  tournament: string;
  tournamentId: number;
  tournamentImageUrl?: string | null;
  hasBracket: boolean;
  streams: { url: string; language: string; official: boolean }[];
  rescheduled: boolean;
  mapWinners: string[];
  serie: string;
  serieId?: number;
  opponents: { id?: number; name: string; imageUrl?: string | null; score?: number }[];
  bestOf: number;
  importance: number;
  importanceReason: string;
  odds?: { bookmaker: string; home?: number; away?: number; updatedAt?: string }[];
};

export type MatchFeed = {
  game: Game;
  matches: Match[];
  demo: boolean;
  source: "PandaScore" | "Demo";
  sourceStatus: "healthy" | "not-configured" | "unavailable";
  updatedAt: string;
};

export type PandaMatch = {
  id: number; status: string; begin_at?: string | null; name: string; number_of_games: number;
  videogame?: { slug?: string };
  league?: { name?: string; image_url?: string | null }; tournament?: { id?: number; name?: string; image_url?: string | null; has_bracket?: boolean }; serie?: { id?: number; full_name?: string; name?: string };
  opponents?: { opponent?: { id?: number; name?: string; image_url?: string | null } }[];
  results?: { score?: number; team_id?: number }[];
  rescheduled?: boolean;
  streams_list?: { raw_url?: string; language?: string; official?: boolean }[];
  games?: { position: number; status: string; winner?: { id?: number | null } }[];
};

export function usableStart(value?: string | null) {
  return validDate(value) ? value as string : "";
}

const topLeagues = ["LCK", "LPL", "LEC", "LTA", "LCP"];
const international = ["world championship", "worlds", "mid-season invitational", "msi", "first stand", "esports world cup"];
const secondary = ["challengers", "academy", "nacl", "erl", "prime league", "lfl", "superliga", "cblol academy"];

export function rateMatch(match: PandaMatch, game: Game = "lol") {
  const text = [match.league?.name, match.tournament?.name, match.serie?.full_name, match.name].filter(Boolean).join(" ").toLowerCase();
  const playoff = /playoff|knockout|final|bracket|elimination|semifinal|quarterfinal/.test(text);
  const final = /grand final|\bfinal\b/.test(text);
  if (game === "valorant") return rateValorantMatch(text);
  const isInternational = international.some((item) => text.includes(item));
  const isTopLeague = topLeagues.some((item) => text.includes(item.toLowerCase()));
  const isSecondary = secondary.some((item) => text.includes(item));
  const stars = Math.max(1, Math.min(5, isInternational ? (final ? 5 : playoff ? 5 : 4) : isTopLeague ? (final ? 5 : playoff ? 4 : 3) : isSecondary ? 1 : playoff ? 3 : 2));
  const reason = isInternational ? (final ? "International final" : playoff ? "International knockout" : "International event") : isTopLeague ? (playoff ? "Top-league playoffs" : "Top regional league") : isSecondary ? "Development league" : playoff ? "Playoff match" : "Regional league";
  return { stars, reason };
}

export function normalizeMatch(match: PandaMatch, requestedStatus: MatchStatus, game: Game = "lol"): Match {
  const scoresByTeam = new Map((match.results ?? []).map((result) => [result.team_id, result.score]));
  const rawOpponents = match.opponents ?? [];
  const teamNames = new Map(rawOpponents.map(({ opponent }) => [opponent?.id, opponent?.name]));
  const { stars, reason } = rateMatch(match, game);
  return {
    id: match.id,
    status: match.status === "running" ? "running" : match.status === "finished" ? "finished" : requestedStatus,
    beginAt: usableStart(match.begin_at),
    name: match.name,
    league: match.league?.name ?? gameName(game),
    leagueImageUrl: match.league?.image_url,
    tournament: match.tournament?.name ?? "",
    tournamentId: match.tournament?.id ?? match.id,
    tournamentImageUrl: match.tournament?.image_url,
    hasBracket: match.tournament?.has_bracket ?? false,
    streams: (match.streams_list ?? []).flatMap((stream) => stream.raw_url ? [{ url: stream.raw_url, language: stream.language ?? "stream", official: stream.official ?? false }] : []).sort((a, b) => Number(b.official) - Number(a.official)),
    rescheduled: match.rescheduled ?? false,
    mapWinners: (match.games ?? []).sort((a, b) => a.position - b.position).flatMap((game) => {
      const name = game.winner?.id ? teamNames.get(game.winner.id) : undefined;
      return game.status === "finished" && name ? [name] : [];
    }),
    serie: match.serie?.full_name ?? match.serie?.name ?? "",
    serieId: match.serie?.id,
    bestOf: match.number_of_games || 1,
    importance: stars,
    importanceReason: reason,
    opponents: rawOpponents.map(({ opponent }) => ({ id: opponent?.id, name: opponent?.name ?? "TBD", imageUrl: opponent?.image_url, score: opponent?.id ? scoresByTeam.get(opponent.id) : undefined }))
  };
}

async function addPreMatchOdds(matches: Match[], game: Game) {
  if (process.env.ENABLE_ODDS !== "true") return matches;
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return matches;
  const bookmakers = process.env.ODDS_BOOKMAKERS ?? "Bet365,Unibet";
  const selectedBookmakers = bookmakers.split(",").map((bookmaker) => bookmaker.trim()).filter(Boolean);
  const maxEvents = Math.max(1, Math.min(10, Number(process.env.ODDS_MAX_EVENTS ?? 10)));
  const eligible = matches.filter((match) => (match.status === "upcoming" || match.status === "running") && match.opponents.length === 2);
  if (!eligible.length || !selectedBookmakers.length) return matches;

  try {
    const eventResponses = await Promise.all(["pending", "live"].map((status) => fetch(`https://api.odds-api.io/v3/events?${new URLSearchParams({ apiKey, sport: "esports", status, limit: "100" })}`, { next: { revalidate: 60 } })));
    if (eventResponses.some((response) => !response.ok)) throw new Error("Odds API events request failed");
    const events = (await Promise.all(eventResponses.map((response) => response.json()))).flat() as OddsEvent[];
    const matchedEvents = events.flatMap((event) => {
      const found = eligible.map((match) => ({ match, orientation: matchOddsEvent(match, event, game) })).filter((item) => item.orientation);
      return found.length === 1 ? [{ event, match: found[0].match, orientation: found[0].orientation as "same" | "reversed" }] : [];
    }).slice(0, maxEvents);
    if (!matchedEvents.length) return matches;
    const eventById = new Map(matchedEvents.map((item) => [item.event.id, item]));
    const eventIds = matchedEvents.map(({ event }) => event.id).join(",");
    const response = await fetch(`https://api.odds-api.io/v3/odds/multi?${new URLSearchParams({ apiKey, eventIds, bookmakers })}`, { next: { revalidate: 60 } });
    if (!response.ok) return matches;
    const payload = await response.json() as { events?: OddsResult[] } | OddsResult[];
    const oddsEvents = Array.isArray(payload) ? payload : payload.events ?? [];
    oddsEvents.forEach((data) => {
      const found = eventById.get(data.id);
      const average = found ? marketAverage(data, found.orientation) : null;
      if (found && average) found.match.odds = [average];
    });
  } catch (error) {
    console.error("Could not load pre-match odds", error);
  }
  return matches;
}

const demo: Match[] = [
  { id: 1, status: "running", beginAt: new Date().toISOString(), name: "T1 vs Gen.G", league: "LCK", tournament: "Season Playoffs", tournamentId: 1, hasBracket: true, streams: [], rescheduled: false, mapWinners: ["T1", "Gen.G"], serie: "LCK 2026", bestOf: 5, importance: 4, importanceReason: "Top-league playoffs", opponents: [{ id: 101, name: "T1", score: 1 }, { id: 102, name: "Gen.G", score: 1 }] },
  { id: 2, status: "upcoming", beginAt: new Date(Date.now() + 7_200_000).toISOString(), name: "G2 Esports vs Karmine Corp", league: "LEC", tournament: "Summer Split", tournamentId: 2, hasBracket: false, streams: [], rescheduled: false, mapWinners: [], serie: "LEC 2026", bestOf: 3, importance: 3, importanceReason: "Top regional league", opponents: [{ id: 103, name: "G2 Esports" }, { id: 104, name: "Karmine Corp" }] },
  { id: 3, status: "finished", beginAt: new Date(Date.now() - 3_600_000).toISOString(), name: "Bilibili Gaming vs Top Esports", league: "LPL", tournament: "Summer Split", tournamentId: 3, hasBracket: false, streams: [], rescheduled: false, mapWinners: ["Bilibili Gaming", "Bilibili Gaming"], serie: "LPL 2026", bestOf: 3, importance: 3, importanceReason: "Top regional league", opponents: [{ id: 105, name: "Bilibili Gaming", score: 2 }, { id: 106, name: "Top Esports", score: 0 }] }
];

export async function getMatches(game: Game = "lol"): Promise<MatchFeed> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return { game, matches: game === "lol" ? demo : [], demo: true, source: "Demo", sourceStatus: "not-configured", updatedAt: new Date().toISOString() };
  const request = async (path: string, status: MatchStatus, page = 1) => {
    const sort = path === "past" ? "-begin_at" : "begin_at";
    const response = await fetch(`https://api.pandascore.co/${game}/matches/${path}?sort=${sort}&per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`PandaScore returned ${response.status}`);
    const sourceDate = response.headers.get("date");
    return { matches: ((await response.json()) as PandaMatch[]).map((match) => normalizeMatch(match, status, game)), sourceDate: sourceDate && validDate(sourceDate) ? sourceDate : null };
  };
  try {
    const groups = await Promise.all([
      request("running", "running"),
      request("upcoming", "upcoming", 1),
      request("upcoming", "upcoming", 2),
      request("past", "finished", 1),
      request("past", "finished", 2)
    ]);
    const statusRank: Record<MatchStatus, number> = { running: 0, upcoming: 1, finished: 2 };
    const sortedMatches = groups.flatMap(group => group.matches).sort((a, b) => {
        const statusDifference = statusRank[a.status] - statusRank[b.status];
        if (statusDifference) return statusDifference;
        const aTime = new Date(a.beginAt).getTime();
        const bTime = new Date(b.beginAt).getTime();
        if (a.status === "finished") return (Number.isFinite(bTime) ? bTime : -Infinity) - (Number.isFinite(aTime) ? aTime : -Infinity);
        return (Number.isFinite(aTime) ? aTime : Infinity) - (Number.isFinite(bTime) ? bTime : Infinity);
      });
    const oldestSourceDate = groups.map(group => group.sourceDate && Date.parse(group.sourceDate)).filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b)[0];
    return { game, matches: await addPreMatchOdds(sortedMatches, game), demo: false, source: "PandaScore", sourceStatus: "healthy", updatedAt: new Date(oldestSourceDate ?? Date.now()).toISOString() };
  } catch (error) {
    console.error(error);
    return { game, matches: game === "lol" ? demo : [], demo: true, source: "Demo", sourceStatus: "unavailable", updatedAt: new Date().toISOString() };
  }
}
