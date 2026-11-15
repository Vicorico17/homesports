import type { FinalFeed } from "./worlds-final.ts";

// Product grouping is deliberately independent of billing and licensing.
// Callers must supply an independently verified cross-provider mapping.
export type VerifiedGridLink = { pandaScoreMatchId: number; gridSeriesId: string };
export type MatchCoverage =
  | { section: "standard"; provider: "PandaScore" }
  | { section: "premium"; provider: "GRID"; gridSeriesId: string; detail: "full" | "basic" };

export function matchCoverage(pandaScoreMatchId: number, link: VerifiedGridLink | null, feed: FinalFeed | null): MatchCoverage {
  if (Number.isSafeInteger(pandaScoreMatchId) && pandaScoreMatchId > 0 &&
      link?.pandaScoreMatchId === pandaScoreMatchId && /^\d{1,20}$/.test(link.gridSeriesId) &&
      feed?.status === "ready" && feed.state?.id === link.gridSeriesId &&
      (feed.coverage === "full" || feed.coverage === "basic")) {
    return { section: "premium", provider: "GRID", gridSeriesId: link.gridSeriesId, detail: feed.coverage };
  }
  return { section: "standard", provider: "PandaScore" };
}
