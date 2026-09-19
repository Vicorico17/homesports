export type BracketMatch = { id: number; name?: string; status?: string; scheduled_at?: string | null; begin_at?: string | null; winner_id?: number | null; opponents?: { opponent?: { id?: number; name?: string; image_url?: string | null } }[]; results?: { team_id?: number; score?: number }[]; previous_matches?: { type?: string; match_id?: number }[] };

export function roundLabel(match: BracketMatch) {
  return (match.name?.split(":")[0]?.trim() || "Playoffs").replace(/\s+match\s+\d+$/i, "");
}
export function scoreFor(match: BracketMatch, index: number) {
  if (match.status !== "running" && match.status !== "finished") return undefined;
  const results = match.results ?? [];
  const id = match.opponents?.[index]?.opponent?.id;
  const score = results.some(result => result.team_id != null) ? results.find(result => id != null && result.team_id === id)?.score : results[index]?.score;
  return typeof score === "number" && Number.isFinite(score) ? score : undefined;
}
function rank(label: string) {
  if (/grand final/i.test(label)) return 100;
  if (/round of (\d+)/i.test(label)) return 64 / Number(label.match(/round of (\d+)/i)![1]);
  if (/quarter/i.test(label)) return 20;
  if (/semi/i.test(label)) return 30;
  if (/final/i.test(label)) return 40;
  return Number(label.match(/\d+/)?.[0] ?? 0);
}
export function layoutBracket(matches: BracketMatch[]) {
  if (!matches.length) return [];
  matches = [...new Map(matches.map(match => [match.id, match])).values()];
  const byId = new Map(matches.map(match => [match.id, match]));
  const depth = (match: BracketMatch, seen = new Set<number>()): number => {
    if (seen.has(match.id)) return 0;
    const next = new Set(seen).add(match.id);
    const parents = (match.previous_matches ?? []).flatMap(ref => byId.has(ref.match_id!) ? [byId.get(ref.match_id!)!] : []);
    return parents.length ? 1 + Math.max(...parents.map(parent => depth(parent, next))) : 0;
  };
  const lanes = ["Upper bracket", "Lower bracket", "Final"];
  const laneFor = (match: BracketMatch) => /grand final/i.test(roundLabel(match)) ? "Final" : /lower|loser|elimination/i.test(roundLabel(match)) ? "Lower bracket" : "Upper bracket";
  const layouts = lanes.flatMap(lane => {
    const selected = matches.filter(match => laneFor(match) === lane);
    if (!selected.length) return [];
    const groups = new Map<string, BracketMatch[]>();
    selected.forEach(match => { const label = roundLabel(match); const key = `${depth(match)}:${label}`; groups.set(key, [...(groups.get(key) ?? []), match]); });
    const rounds = [...groups.values()].sort((a, b) => depth(a[0]) - depth(b[0]) || rank(roundLabel(a[0])) - rank(roundLabel(b[0])) || roundLabel(a[0]).localeCompare(roundLabel(b[0])));
    const positions = new Map<number, { x: number; y: number }>();
    const count = Math.max(...rounds.map(round => round.length));
    let height = count * 128;
    rounds.forEach((round, column) => {
      round.sort((a, b) => {
        const parentY = (match: BracketMatch) => (match.previous_matches ?? []).flatMap(ref => positions.has(ref.match_id!) ? [positions.get(ref.match_id!)!.y] : []);
        const aY = parentY(a), bY = parentY(b);
        return aY.length && bY.length ? aY[0] - bY[0] : (Date.parse(a.scheduled_at ?? "") || 0) - (Date.parse(b.scheduled_at ?? "") || 0) || a.id - b.id;
      });
      let previousY = -128;
      round.forEach((match, index) => {
        const parents = (match.previous_matches ?? []).flatMap(ref => positions.has(ref.match_id!) ? [positions.get(ref.match_id!)!.y] : []);
        const ideal = parents.length ? parents.reduce((a, b) => a + b, 0) / parents.length : (index + .5) * count * 128 / round.length;
        const y = Math.max(64, ideal, previousY + 128);
        positions.set(match.id, { x: column * 288, y }); previousY = y; height = Math.max(height, y + 64);
      });
    });
    const edges = selected.flatMap(match => (match.previous_matches ?? []).flatMap(ref => {
      const from = positions.get(ref.match_id!), to = positions.get(match.id);
      return from && to && from.x < to.x ? [{ from, to, loser: ref.type === "loser", key: `${ref.match_id}-${match.id}` }] : [];
    }));
    return [{ name: lane === "Upper bracket" && !matches.some(match => laneFor(match) === "Lower bracket") ? "Playoffs" : lane, rounds, positions, edges, height, width: rounds.length * 288 - 32 }];
  });
  // One shared coordinate system preserves upper-to-lower and final feeders.
  const columns = new Map<number, number>();
  const minimumColumns = new Map<number, number>();
  layouts.forEach(lane => lane.rounds.forEach((round, column) => round.forEach(match => minimumColumns.set(match.id, column))));
  const columnFor = (match: BracketMatch, seen = new Set<number>()): number => {
    if (columns.has(match.id)) return columns.get(match.id)!;
    if (seen.has(match.id)) return 0;
    const next = new Set(seen).add(match.id);
    const parents = (match.previous_matches ?? []).flatMap(ref => byId.has(ref.match_id!) ? [byId.get(ref.match_id!)!] : []);
    const column = Math.max(minimumColumns.get(match.id) ?? 0, ...parents.map(parent => columnFor(parent, next) + 1));
    columns.set(match.id, column);
    return column;
  };
  matches.forEach(match => columnFor(match));
  const finalists = matches.filter(match => laneFor(match) === "Final");
  const lastMainColumn = Math.max(-1, ...matches.filter(match => laneFor(match) !== "Final").map(match => columns.get(match.id)!));
  finalists.forEach(match => columns.set(match.id, Math.max(columns.get(match.id)!, lastMainColumn + 1 + (minimumColumns.get(match.id) ?? 0))));
  const positions = new Map<number, { x: number; y: number }>();
  const sections: { name: string; y: number }[] = [];
  let height = 0;
  layouts.filter(lane => lane.name !== "Final").forEach(lane => {
    sections.push({ name: lane.name, y: height });
    lane.positions.forEach((position, id) => positions.set(id, { x: columns.get(id)! * 288, y: position.y + height + 32 }));
    height += lane.height + 64;
  });
  let finalY = Math.max(80, height / 2);
  finalists.forEach(match => {
    positions.set(match.id, { x: columns.get(match.id)! * 288, y: finalY });
    finalY += 128;
  });
  height = Math.max(height, finalists.length ? finalY - 64 : 0);
  const rounds: BracketMatch[][] = Array.from({ length: Math.max(...columns.values()) + 1 }, () => []);
  matches.forEach(match => rounds[columns.get(match.id)!].push(match));
  rounds.forEach(round => round.sort((a, b) => positions.get(a.id)!.y - positions.get(b.id)!.y || a.id - b.id));
  const edges = matches.flatMap(match => (match.previous_matches ?? []).flatMap(ref => {
    const from = positions.get(ref.match_id!), to = positions.get(match.id);
    return from && to && from.x < to.x ? [{ from, to, loser: ref.type === "loser", key: `${ref.match_id}-${match.id}` }] : [];
  }));
  return [{ name: "Complete playoff bracket", rounds, positions, edges, sections, height, width: rounds.length * 288 - 32 }];
}
