import type { MatchFeed } from "./matches";

/** Keep the last displayed schedule and its label until a live refresh succeeds. */
export function mergeMatchFeed(previous: MatchFeed, next: MatchFeed): MatchFeed {
  return next.sourceStatus === "healthy"
    ? next
    : { ...previous, sourceStatus: next.sourceStatus };
}

export function shouldPollMatchFeed(status: MatchFeed["sourceStatus"]): boolean {
  return status !== "not-configured";
}
