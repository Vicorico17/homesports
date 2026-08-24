type CargoRow = { title?: Record<string, string | number | boolean | null>; fields?: Record<string, string | number | boolean | null> };
type CargoResponse = { cargoquery?: CargoRow[] };

export type LeaguepediaStanding = { Team?: string; Place?: number; WinSeries?: number; LossSeries?: number; TieSeries?: number; WinGames?: number; LossGames?: number; Points?: number; Streak?: number; StreakDirection?: string };
export type LeaguepediaMatch = { MatchId?: string; DateTime_UTC?: string; Team1?: string; Team2?: string; Team1Final?: string; Team2Final?: string; Team1Score?: number; Team2Score?: number; Winner?: string; Phase?: string; Round?: string; Tab?: string; N_MatchInTab?: number };
export type LeaguepediaCompetition = { overviewPage: string; standardName?: string; standings: LeaguepediaStanding[]; matches: LeaguepediaMatch[] };

function rowData(row: CargoRow) { return row.title ?? row.fields ?? {}; }
function quote(value: string) { return value.replace(/"/g, "\\\""); }

async function query(table: string, fields: string, where: string, limit = 100) {
  const params = new URLSearchParams({ action: "cargoquery", format: "json", tables: table, fields, where, limit: String(limit) });
  const response = await fetch(`https://lol.fandom.com/api.php?${params.toString()}`, { next: { revalidate: 900 } });
  if (!response.ok) return [];
  const payload = await response.json() as CargoResponse;
  return (payload.cargoquery ?? []).map(rowData);
}

export async function getLeaguepediaCompetition(names: string[]) {
  try {
    const candidates = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    let tournament: Record<string, string | number | boolean | null> | undefined;
    for (const name of candidates) {
      const rows = await query("Tournaments", "OverviewPage,StandardName,Name", `StandardName="${quote(name)}" OR Name="${quote(name)}" OR OverviewPage="${quote(name)}"`, 5);
      if (rows[0]) { tournament = rows[0]; break; }
    }
    if (!tournament?.OverviewPage) return null;
    const overviewPage = String(tournament.OverviewPage);
    const [standingsRows, matchesRows] = await Promise.all([
      query("Standings", "Team,Place,WinSeries,LossSeries,TieSeries,WinGames,LossGames,Points,Streak,StreakDirection", `OverviewPage="${quote(overviewPage)}"`, 100),
      query("MatchSchedule", "MatchId,DateTime_UTC,Team1,Team2,Team1Final,Team2Final,Team1Score,Team2Score,Winner,Phase,Round,Tab,N_MatchInTab", `OverviewPage="${quote(overviewPage)}"`, 200),
    ]);
    return { overviewPage, standardName: tournament.StandardName ? String(tournament.StandardName) : undefined, standings: standingsRows as LeaguepediaStanding[], matches: matchesRows as LeaguepediaMatch[] } satisfies LeaguepediaCompetition;
  } catch { return null; }
}
