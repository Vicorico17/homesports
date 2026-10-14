import { getMatches, normalizeMatch, type MatchFeed, type PandaMatch } from "@/lib/matches";
import { panda } from "@/lib/pandascore";
import { isWorlds2026Match, worldsStage } from "@/lib/worlds";
import type { WorldsData } from "@/lib/worlds";
import type { BracketMatch } from "@/lib/bracket";

export async function getWorldsData(existingFeed?: MatchFeed): Promise<WorldsData> {
  const feed = existingFeed ?? await getMatches();
  const matches = feed.demo ? [] : feed.matches.filter(isWorlds2026Match);
  const seriesIds = [...new Set(matches.flatMap(match => match.serieId ? [match.serieId] : []))];
  let complete = !feed.demo;
  const allMatches = new Map(matches.map(match => [match.id, match]));
  // Fetch the season directly so old Worlds matches do not fall out of the general matchboard window.
  for (const id of seriesIds) {
    for (let page = 1; page <= 5; page++) {
      const batch = await panda<PandaMatch[]>(`series/${id}/matches?per_page=100&page=${page}&sort=begin_at`);
      if (!Array.isArray(batch)) { complete = false; break; }
      for (const raw of batch) {
        if (!["running", "finished", "not_started"].includes(raw.status)) continue;
        const match = normalizeMatch(raw, raw.status === "finished" ? "finished" : raw.status === "running" ? "running" : "upcoming");
        if (isWorlds2026Match(match)) allMatches.set(match.id, match);
      }
      if (batch.length < 100) break;
      if (page === 5) complete = false;
    }
  }
  const all = [...allMatches.values()];
  const tournamentIds = [...new Set(all.filter(match => match.hasBracket && ["Play-in", "Knockout"].includes(worldsStage(match))).map(match => match.tournamentId))];
  const brackets = await Promise.all(tournamentIds.map(async id => {
    const bracket = await panda<BracketMatch[]>(`tournaments/${id}/brackets`);
    const match = all.find(match => match.tournamentId === id)!;
    return { tournamentId: id, stage: worldsStage(match), matches: Array.isArray(bracket) ? bracket : [], available: Array.isArray(bracket) && bracket.length > 0 };
  }));
  return { matches: all, brackets, updatedAt: feed.updatedAt, sourceStatus: feed.sourceStatus, complete };
}
