type Team = { id?: number; name?: string; image_url?: string | null };
type ResultMatch = { id: number; status?: string; opponents?: { opponent?: Team }[]; results?: { team_id?: number; score?: number }[] };

export function numericStat(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function deriveStandings(matches: ResultMatch[]) {
  const rows = new Map<number, { team: Team; wins: number; losses: number }>();
  for (const match of new Map(matches.map(match => [match.id, match])).values()) {
    const teams = (match.opponents ?? []).map(entry => entry.opponent).filter((team): team is Team & { id: number } => team?.id != null);
    for (const team of teams) if (!rows.has(team.id)) rows.set(team.id, { team, wins: 0, losses: 0 });
    if (match.status !== "finished" || teams.length !== 2 || teams[0].id === teams[1].id) continue;
    const scores = teams.map(team => numericStat(match.results?.find(result => result.team_id === team.id)?.score));
    if (scores[0] == null || scores[1] == null || scores[0] === scores[1]) continue;
    teams.forEach((team, index) => { rows.get(team.id)![scores[index]! > scores[1 - index]! ? "wins" : "losses"] += 1; });
  }
  return [...rows.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses || (a.team.name ?? "").localeCompare(b.team.name ?? ""));
}
