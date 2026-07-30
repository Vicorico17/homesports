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
  serie: string;
  opponents: { name: string; imageUrl?: string | null; score?: number }[];
  bestOf: number;
  importance: number;
  importanceReason: string;
};

type PandaMatch = {
  id: number; status: string; begin_at: string; name: string; number_of_games: number;
  league?: { name?: string; image_url?: string | null }; tournament?: { id?: number; name?: string; has_bracket?: boolean }; serie?: { full_name?: string; name?: string };
  opponents?: { opponent?: { id?: number; name?: string; image_url?: string | null } }[];
  results?: { score?: number; team_id?: number }[];
  rescheduled?: boolean;
  streams_list?: { raw_url?: string; language?: string; official?: boolean }[];
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
    serie: match.serie?.full_name ?? match.serie?.name ?? "",
    bestOf: match.number_of_games || 1,
    importance: stars,
    importanceReason: reason,
    opponents: rawOpponents.map(({ opponent }) => ({ name: opponent?.name ?? "TBD", imageUrl: opponent?.image_url, score: opponent?.id ? scoresByTeam.get(opponent.id) : undefined }))
  };
}

const demo: Match[] = [
  { id: 1, status: "running", beginAt: new Date().toISOString(), name: "T1 vs Gen.G", league: "LCK", tournament: "Season Playoffs", tournamentId: 1, hasBracket: true, streams: [], rescheduled: false, serie: "LCK 2026", bestOf: 5, importance: 4, importanceReason: "Top-league playoffs", opponents: [{ name: "T1", score: 1 }, { name: "Gen.G", score: 1 }] },
  { id: 2, status: "upcoming", beginAt: new Date(Date.now() + 7_200_000).toISOString(), name: "G2 Esports vs Karmine Corp", league: "LEC", tournament: "Summer Split", tournamentId: 2, hasBracket: false, streams: [], rescheduled: false, serie: "LEC 2026", bestOf: 3, importance: 3, importanceReason: "Top regional league", opponents: [{ name: "G2 Esports" }, { name: "Karmine Corp" }] },
  { id: 3, status: "finished", beginAt: new Date(Date.now() - 3_600_000).toISOString(), name: "Bilibili Gaming vs Top Esports", league: "LPL", tournament: "Summer Split", tournamentId: 3, hasBracket: false, streams: [], rescheduled: false, serie: "LPL 2026", bestOf: 3, importance: 3, importanceReason: "Top regional league", opponents: [{ name: "Bilibili Gaming", score: 2 }, { name: "Top Esports", score: 0 }] }
];

export async function getMatches(): Promise<{ matches: Match[]; demo: boolean }> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return { matches: demo, demo: true };
  const request = async (path: string, status: MatchStatus, page = 1) => {
    const sort = path === "past" ? "-begin_at" : "begin_at";
    const response = await fetch(`https://api.pandascore.co/lol/matches/${path}?sort=${sort}&per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`PandaScore returned ${response.status}`);
    return ((await response.json()) as PandaMatch[]).map((match) => normalize(match, status));
  };
  try {
    const groups = await Promise.all([request("running", "running"), request("upcoming", "upcoming", 1), request("upcoming", "upcoming", 2)]);
    const statusRank: Record<MatchStatus, number> = { running: 0, upcoming: 1, finished: 2 };
    return {
      matches: groups.flat().sort((a, b) => {
        const statusDifference = statusRank[a.status] - statusRank[b.status];
        if (statusDifference) return statusDifference;
        if (a.status === "finished") return +new Date(b.beginAt) - +new Date(a.beginAt);
        return +new Date(a.beginAt) - +new Date(b.beginAt);
      }),
      demo: false
    };
  } catch (error) {
    console.error(error);
    return { matches: demo, demo: true };
  }
}
