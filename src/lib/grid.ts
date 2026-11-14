import { fullSnapshotQuery } from "./grid-query.ts";
import { normalizeFinalState, type FinalFeed } from "./worlds-final.ts";

// Open Access endpoints; credentials remain on the server.
const central = "https://api-op.grid.gg/central-data/graphql";
const seriesState = "https://api-op.grid.gg/live-data-feed/series-state/graphql";

async function query<T>(endpoint: string, document: string, variables: Record<string, string> = {}): Promise<T | null> {
  try {
    const response = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.GRID_API_KEY! },
      body: JSON.stringify({ query: document, variables }), next: { revalidate: 60 }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: T; errors?: unknown[] };
    return payload.errors?.length ? null : payload.data ?? null;
  } catch { return null; }
}

const coreTeam = "id name won score kills deaths players { id name kills deaths }";
const stateQuery = (detailed: boolean) => detailed ? fullSnapshotQuery : `query WorldsFinal($id: ID!) {
  seriesState(id: $id) {
    id valid started finished updatedAt
    teams { ${coreTeam} }
    games { id sequenceNumber started finished teams { ${coreTeam} } }
  }
}`;

export async function getGridFinal(): Promise<FinalFeed> {
  const empty = { state: null, fetchedAt: null };
  if (!process.env.GRID_API_KEY) return { ...empty, status: "not-configured" };
  let id = process.env.GRID_WORLDS_FINAL_SERIES_ID;
  if (!id) {
    // Only select an unambiguous Worlds series on the announced final day.
    const data = await query<{ allSeries: { edges: { node: { id: string; tournament: { name: string } } }[]; pageInfo: { hasNextPage: boolean } } }>(central, `query WorldsFinalSeries {
      allSeries(filter: { startTimeScheduled: { gte: "2026-11-14T00:00:00Z", lte: "2026-11-14T23:59:59Z" } }, orderBy: StartTimeScheduled) {
        edges { node { id tournament { name } } } pageInfo { hasNextPage }
      }
    }`);
    if (!data?.allSeries) return { ...empty, status: "unavailable" };
    const candidates = data.allSeries.edges.filter(({ node }) => /worlds|world championship/i.test(node.tournament.name));
    if (candidates.length !== 1 || data.allSeries.pageInfo.hasNextPage) return { ...empty, status: "pending" };
    id = candidates[0].node.id;
  }
  // New or restricted data models may omit extended fields. Preserve basic coverage.
  let data = await query<{ seriesState: unknown }>(seriesState, stateQuery(true), { id });
  const coverage = data ? "full" : "basic";
  data ??= await query<{ seriesState: unknown }>(seriesState, stateQuery(false), { id });
  // GRID returns { data: {} } before a series snapshot has been published.
  if (data && data.seriesState == null) return { ...empty, status: "pending" };
  const state = normalizeFinalState(data?.seriesState);
  return { state, coverage, status: state ? "ready" : "unavailable", fetchedAt: state ? new Date().toISOString() : null };
}
