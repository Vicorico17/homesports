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

/** Group the display without dropping fields, including unfamiliar future metrics. */
export function organizeStats(group: StatGroup): StatGroup[] {
  const buckets = ["Combat", "Economy", "Loadout & abilities", "Vision & positioning", "Objectives & map control", "Health & status", "Match details"]
    .map(title => ({ title, fields: [] as StatField[], groups: [] as StatGroup[] }));
  const category = (key: string) => {
    if (/inventory|items|loadout|abilit|active effects|status effects/i.test(key)) return 2;
    if (/vision|ward|position|forward|bounds/i.test(key)) return 3;
    if (/objective|structure|tower|baron|draft|pick|ban|neutral|unit kills/i.test(key)) return 4;
    if (/money|gold|worth|experience/i.test(key)) return 1;
    if (/health|armor|alive|respawn|participation status/i.test(key)) return 5;
    if (/kill|death|assist|damage|kda|first blood|combat/i.test(key)) return 0;
    return 6;
  };
  for (const field of group.fields) buckets[category(field.key + " " + field.label)].fields.push(field);
  for (const child of group.groups) {
    // GRID nests inventory.items; show the item cards under one heading.
    const display = !child.fields.length && child.groups.length === 1 && child.groups[0].title === child.title ? child.groups[0] : child;
    buckets[category(child.title)].groups.push(display);
  }
  const priority = ["kills", "deaths", "killAssistsGiven", "kdaRatio", "killParticipation", "damageDealt", "damagePerMinute", "damageTaken", "damagePercentage", "firstKill", "killAssistsReceived", "totalMoneyEarned", "netWorth", "moneyDifference", "moneyPerMinute", "money", "visionScore", "visionScorePerMinute", "currentHealth", "maxHealth", "currentArmor"];
  for (const bucket of buckets) bucket.fields.sort((a, b) => {
    const rank = (key: string) => { const index = priority.indexOf(key); return index < 0 ? priority.length : index; };
    return rank(a.key) - rank(b.key);
  });
  const additional = buckets[0].fields.filter(field => /teamkill|selfkill|weapon/i.test(field.key));
  if (additional.length) {
    buckets[0].fields = buckets[0].fields.filter(field => !additional.includes(field));
    buckets[0].groups.push({ title: "Additional combat stats", fields: additional, groups: [] });
  }
  return buckets.filter(bucket => bucket.fields.length || bucket.groups.length);
}
