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
  hasBracket: boolean;
  streams: { url: string; language: string; official: boolean }[];
  rescheduled: boolean;
  mapWinners: string[];
  serie: string;
  opponents: { name: string; imageUrl?: string | null; score?: number }[];
  bestOf: number;
  importance: number;
  importanceReason: string;
  odds?: { bookmaker: string; home?: number; away?: number; updatedAt?: string }[];
};

type PandaMatch = {
  id: number; status: string; begin_at: string; name: string; number_of_games: number;
  league?: { name?: string; image_url?: string | null }; tournament?: { id?: number; name?: string; has_bracket?: boolean }; serie?: { full_name?: string; name?: string };
  opponents?: { opponent?: { id?: number; name?: string; image_url?: string | null } }[];
  results?: { score?: number; team_id?: number }[];
  rescheduled?: boolean;
  streams_list?: { raw_url?: string; language?: string; official?: boolean }[];
  games?: { position: number; status: string; winner?: { id?: number | null } }[];
};

const topLeagues = ["LCK", "LPL", "LEC", "LTA", "LCP"];
const international = ["world championship", "worlds", "mid-season invitational", "msi", "first stand", "esports world cup"];
const secondary = ["challengers", "academy", "nacl", "erl", "prime league", "lfl", "superliga", "cblol academy"];

export function rateMatch(match: PandaMatch) {
  const text = [match.league?.name, match.tournament?.name, match.serie?.full_name, match.name].filter(Boolean).join(" ").toLowerCase();
  const playoff = /playoff|knockout|final|bracket|elimination|semifinal|quarterfinal/.test(text);
  const final = /grand final|\bfinal\b/.test(text);
  const isInternational = international.some((item) => text.includes(item));
  const isTopLeague = topLeagues.some((item) => text.includes(item.toLowerCase()));
  const isSecondary = secondary.some((item) => text.includes(item));
  const stars = Math.max(1, Math.min(5, isInternational ? (final ? 5 : playoff ? 5 : 4) : isTopLeague ? (final ? 5 : playoff ? 4 : 3) : isSecondary ? 1 : playoff ? 3 : 2));
  const reason = isInternational ? (final ? "International final" : playoff ? "International knockout" : "International event") : isTopLeague ? (playoff ? "Top-league playoffs" : "Top regional league") : isSecondary ? "Development league" : playoff ? "Playoff match" : "Regional league";
  return { stars, reason };
}

function normalize(match: PandaMatch, requestedStatus: MatchStatus): Match {
  const scoresByTeam = new Map((match.results ?? []).map((result) => [result.team_id, result.score]));
  const rawOpponents = match.opponents ?? [];
  const teamNames = new Map(rawOpponents.map(({ opponent }) => [opponent?.id, opponent?.name]));
  const { stars, reason } = rateMatch(match);
  return {
    id: match.id,
    status: match.status === "running" ? "running" : match.status === "finished" ? "finished" : requestedStatus,
    beginAt: match.begin_at,
    name: match.name,
    league: match.league?.name ?? "League of Legends",
    leagueImageUrl: match.league?.image_url,
    tournament: match.tournament?.name ?? "",
    tournamentId: match.tournament?.id ?? match.id,
    hasBracket: match.tournament?.has_bracket ?? false,
    streams: (match.streams_list ?? []).flatMap((stream) => stream.raw_url ? [{ url: stream.raw_url, language: stream.language ?? "stream", official: stream.official ?? false }] : []),
    rescheduled: match.rescheduled ?? false,
    mapWinners: (match.games ?? []).sort((a, b) => a.position - b.position).flatMap((game) => {
      const name = game.winner?.id ? teamNames.get(game.winner.id) : undefined;
      return game.status === "finished" && name ? [name] : [];
    }),
    serie: match.serie?.full_name ?? match.serie?.name ?? "",
    bestOf: match.number_of_games || 1,
    importance: stars,
    importanceReason: reason,
    opponents: rawOpponents.map(({ opponent }) => ({ name: opponent?.name ?? "TBD", imageUrl: opponent?.image_url, score: opponent?.id ? scoresByTeam.get(opponent.id) : undefined }))
  };
}

function oddsName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function addPreMatchOdds(matches: Match[]) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return matches;
  const bookmakers = process.env.ODDS_BOOKMAKERS ?? "Bet365,Unibet";
  const maxEvents = Math.max(1, Math.min(10, Number(process.env.ODDS_MAX_EVENTS ?? 10)));
  const eligible = matches.filter((match) => (match.status === "upcoming" || match.status === "running") && match.opponents.length === 2);
  if (!eligible.length) return matches;

  try {
    const eventResponses = await Promise.all(["pending", "live"].map((status) => fetch(`https://api.odds-api.io/v3/events?apiKey=${apiKey}&sport=esports&status=${status}&limit=100`, { next: { revalidate: 900 } })));
    if (eventResponses.some((response) => !response.ok)) throw new Error("Odds API events request failed");
    const events = (await Promise.all(eventResponses.map((response) => response.json())))
      .flat() as { id: number; home: string; away: string; date: string }[];
    const matchesById = new Map(matches.map((match) => [match.id, match]));
    const matchedEvents = events.flatMap((event) => {
      const eventTeams = [oddsName(event.home), oddsName(event.away)];
        const match = eligible.find((candidate) => {
        const teams = candidate.opponents.slice(0, 2).map((team) => oddsName(team.name));
        const sameTeams = teams.every((team) => eventTeams.some((eventTeam) => eventTeam.includes(team) || team.includes(eventTeam)));
        const closeStart = Math.abs(new Date(candidate.beginAt).getTime() - new Date(event.date).getTime()) < 12 * 60 * 60 * 1000;
        return sameTeams && closeStart;
      });
      return match ? [{ event, match }] : [];
    }).slice(0, maxEvents);

    const eventById = new Map(matchedEvents.map(({ event, match }) => [event.id, match]));
    const eventIds = matchedEvents.map(({ event }) => event.id).join(",");
    const response = await fetch(`https://api.odds-api.io/v3/odds/multi?apiKey=${apiKey}&eventIds=${eventIds}&bookmakers=${encodeURIComponent(bookmakers)}`, { next: { revalidate: 900 } });
    if (!response.ok) return matches;
    const payload = await response.json() as { events?: { id: number; bookmakers?: Record<string, { name: string; odds?: { home?: string; away?: string; updatedAt?: string }[] }[]> }[] } | { id: number; bookmakers?: Record<string, { name: string; odds?: { home?: string; away?: string; updatedAt?: string }[] }[]> }[];
    const oddsEvents = Array.isArray(payload) ? payload : payload.events ?? [];
    oddsEvents.forEach((data) => {
      const odds = Object.entries(data.bookmakers ?? {}).flatMap(([bookmaker, markets]) => {
        const market = markets.find((item) => item.name === "ML");
        const price = market?.odds?.[0];
        if (!price || (!price.home && !price.away)) return [];
        return [{ bookmaker, home: price.home ? Number(price.home) : undefined, away: price.away ? Number(price.away) : undefined, updatedAt: market?.odds?.[0]?.updatedAt }];
      });
      const match = eventById.get(data.id);
      const target = match ? matchesById.get(match.id) : undefined;
      if (target && odds.length) {
        const average = (side: "home" | "away") => {
          const values = odds.flatMap((odd) => odd[side] && Number.isFinite(odd[side]) ? [odd[side] as number] : []);
          return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
        };
        target.odds = [{ bookmaker: "Market average", home: average("home"), away: average("away"), updatedAt: odds.map((odd) => odd.updatedAt).filter(Boolean).sort().at(-1) }];
      }
    });
  } catch (error) {
    console.error("Could not load pre-match odds", error);
  }
  return matches;
}

const demo: Match[] = [
  { id: 1, status: "running", beginAt: new Date().toISOString(), name: "T1 vs Gen.G", league: "LCK", tournament: "Season Playoffs", tournamentId: 1, hasBracket: true, streams: [], rescheduled: false, mapWinners: ["T1", "Gen.G"], serie: "LCK 2026", bestOf: 5, importance: 4, importanceReason: "Top-league playoffs", opponents: [{ name: "T1", score: 1 }, { name: "Gen.G", score: 1 }] },
  { id: 2, status: "upcoming", beginAt: new Date(Date.now() + 7_200_000).toISOString(), name: "G2 Esports vs Karmine Corp", league: "LEC", tournament: "Summer Split", tournamentId: 2, hasBracket: false, streams: [], rescheduled: false, mapWinners: [], serie: "LEC 2026", bestOf: 3, importance: 3, importanceReason: "Top regional league", opponents: [{ name: "G2 Esports" }, { name: "Karmine Corp" }] },
  { id: 3, status: "finished", beginAt: new Date(Date.now() - 3_600_000).toISOString(), name: "Bilibili Gaming vs Top Esports", league: "LPL", tournament: "Summer Split", tournamentId: 3, hasBracket: false, streams: [], rescheduled: false, mapWinners: ["Bilibili Gaming", "Bilibili Gaming"], serie: "LPL 2026", bestOf: 3, importance: 3, importanceReason: "Top regional league", opponents: [{ name: "Bilibili Gaming", score: 2 }, { name: "Top Esports", score: 0 }] }
];

export async function getMatches(fresh = false): Promise<{ matches: Match[]; demo: boolean }> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return { matches: demo, demo: true };
  const request = async (path: string, status: MatchStatus, page = 1) => {
    const sort = path === "past" ? "-begin_at" : "begin_at";
    const response = await fetch(`https://api.pandascore.co/lol/matches/${path}?sort=${sort}&per_page=100&page=${page}`, fresh ? { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" } : { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 30 } });
    if (!response.ok) throw new Error(`PandaScore returned ${response.status}`);
    return ((await response.json()) as PandaMatch[]).map((match) => normalize(match, status));
  };
  try {
    const groups = await Promise.all([request("running", "running"), request("upcoming", "upcoming", 1), request("upcoming", "upcoming", 2)]);
    const statusRank: Record<MatchStatus, number> = { running: 0, upcoming: 1, finished: 2 };
    const sortedMatches = groups.flat().sort((a, b) => {
        const statusDifference = statusRank[a.status] - statusRank[b.status];
        if (statusDifference) return statusDifference;
        if (a.status === "finished") return +new Date(b.beginAt) - +new Date(a.beginAt);
        return +new Date(a.beginAt) - +new Date(b.beginAt);
      });
    return { matches: await addPreMatchOdds(sortedMatches), demo: false };
  } catch (error) {
    console.error(error);
    return { matches: demo, demo: true };
  }
}
