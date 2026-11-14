/** Presentation-safe snapshot fields: no internal IDs, links, or downloadable raw feed. */
export type StatField = { key: string; label: string; value: string | number | boolean | null; unit?: string };
export type StatGroup = { title: string; fields: StatField[]; groups: StatGroup[] };
const labels: Record<string, string> = {
  killAssistsGiven: "Assists", killAssistsReceived: "Assists received", money: "Unspent gold",
  loadoutValue: "Item value", totalMoneyEarned: "Gold earned", moneyPerMinute: "Gold / min",
  moneyDifference: "Gold difference", moneyPercentage: "Gold share", damagePercentage: "Damage share",
  damageDealt: "Damage dealt (all targets)", damagePerMinute: "Damage / min", damagePerMoney: "Damage / gold",
  visionScorePerMinute: "Vision / min", kdaRatio: "KDA ratio", firstKill: "First blood",
  currentArmor: "Armor", currentHealth: "Health", maxHealth: "Maximum health", experiencePoints: "Experience",
  forwardPercentage: "Time forward", killParticipation: "Kill participation", currentSeconds: "Seconds",
  titleVersion: "Patch", nonPlayerCharacters: "Neutral monsters", unitKills: "Minions, monsters & wards",
  killAssistsReceivedFromPlayer: "Assists by teammate", baronPowerPlays: "Baron power plays",
  draftActions: "Picks & bans", structures: "Towers & structures", inventory: "Items", completionCount: "Count",
  completedFirst: "First to complete", respawnClock: "Respawn timer", statusEffects: "Active effects",
  majorMoneyLead: "Major gold lead (provider metric)", majorMoneyDeficit: "Major gold deficit (provider metric)",
};
export const statLabel = (key: string) => labels[key] ?? key.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/^./, c => c.toUpperCase());
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const technical = new Set(["id", "__typename", "valid", "externalLinks", "invalidationReason"]);
const percentages = new Set(["moneyPercentage", "damagePercentage", "forwardPercentage", "killParticipation"]);

export function snapshotDetails(value: unknown, omitted: string[] = [], names: Record<string, string> = {}, title = "Snapshot"): StatGroup {
  const fields: StatField[] = [], groups: StatGroup[] = [];
  for (const [key, item] of Object.entries(object(value))) {
    if (technical.has(key) || omitted.includes(key)) continue;
    if (Array.isArray(item)) {
      if (!item.length) continue;
      const children = item.map((entry, index) => {
        const record = object(entry);
        const identifier = key === "structures" ? record.id : record.name ?? record.unitName ?? record.weaponName ?? record.type ?? record.id;
        const heading = typeof identifier === "string" && !/^[a-f\d-]{30,}$/i.test(identifier) ? (names[identifier] ?? statLabel(identifier)) : `${statLabel(key)} ${index + 1}`;
        if (key === "roles") return { title: "Role", fields: [{ key: "role", label: "Role", value: String(record.id ?? "Unknown") }], groups: [] };
        return snapshotDetails(entry, ["name", "unitName", "weaponName", "type"], names, heading);
      });
      groups.push({ title: statLabel(key), fields: [], groups: children });
    } else if (item !== null && typeof item === "object") {
      if ((key === "drafter" || key === "roles") && object(item).id) {
        fields.push({key, label:statLabel(key), value:names[String(object(item).id)] ?? String(object(item).id)});
      } else {
        const group = snapshotDetails(item, [], names, statLabel(key));
        if (group.fields.length || group.groups.length) groups.push(group);
      }
    } else {
      let display: StatField["value"] = null;
      if (typeof item === "number" && Number.isFinite(item)) display = item;
      if (typeof item === "boolean" || typeof item === "string") display = item;
      if (key === "teamId" || key === "playerId") display = names[String(item)] ?? "Unknown participant";
      fields.push({ key, label: key === "teamId" ? "Team" : key === "playerId" ? "Player" : statLabel(key), value: display, ...(percentages.has(key) ? {unit:"%"} : {}) });
    }
  }
  return { title, fields, groups };
}
