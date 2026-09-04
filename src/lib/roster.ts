export type RosterPlayer = { id: number | string; nickname?: string; name?: string; image_url?: string | null; role?: string; position?: string; lane?: string; role_name?: string; active?: boolean; substitute?: boolean; is_substitute?: boolean; status?: string };
export type LeaguepediaRosterRow = { title?: { Team?: string; Link?: string; Role?: string; IsSubstitute?: string | boolean; IsTrainee?: string | boolean }; fields?: { Team?: string; Link?: string; Role?: string; IsSubstitute?: string | boolean; IsTrainee?: string | boolean } };

export function normalizedPlayerName(value?: string) { return value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? ""; }
function truthy(value?: string | boolean) { return value === true || value === "1" || value === "true" || value === "yes"; }
function decodeHtml(value: string) { return value.replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').trim(); }

export function parseRenderedRosterHtml(html: string, pandaPlayers: RosterPlayer[] = []) {
  const table = html.match(/<table class="[^"]*team-members-current[^"]*">([\s\S]*?)<\/table>/)?.[1] ?? "";
  const rows = [...table.matchAll(/<td class="team-members-player"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<\/td>[\s\S]*?<td class="team-members-irlname"[^>]*>[\s\S]*?<\/td>[\s\S]*?<td class="team-members-role"[^>]*>[\s\S]*?<span title="([^"]+)"/g)];
  return rows.map((row, index) => { const nickname = decodeHtml(row[1]); const role = decodeHtml(row[2]); const match = pandaPlayers.find((player) => normalizedPlayerName(player.nickname ?? player.name) === normalizedPlayerName(nickname)); return { ...(match ?? {}), id: match?.id ?? `leaguepedia-rendered-${normalizedPlayerName(nickname)}-${index}`, nickname, role, substitute: false, is_substitute: false }; });
}

export function parseCargoRoster(rows: LeaguepediaRosterRow[], pandaPlayers: RosterPlayer[] = []) {
  return rows.flatMap((row, index) => { const fields = row.title ?? row.fields ?? {}; const nickname = fields.Link?.trim(); if (!nickname) return []; const match = pandaPlayers.find((player) => normalizedPlayerName(player.nickname ?? player.name) === normalizedPlayerName(nickname)); const substitute = truthy(fields.IsSubstitute) || truthy(fields.IsTrainee); return [{ ...(match ?? {}), id: match?.id ?? `leaguepedia-${normalizedPlayerName(nickname)}-${index}`, nickname, role: fields.Role ?? match?.role, substitute, is_substitute: substitute }]; });
}
