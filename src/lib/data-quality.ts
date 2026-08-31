export function normalizedLabel(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

export function validDate(value?: string | null) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).getUTCFullYear() >= 2000;
}

export function canonicalRole(value?: string | null) {
  const role = normalizedLabel(value).replace(/\s/g, "");
  if (/^(top|toplane|toplaner)$/.test(role)) return "top";
  if (/^(jungle|jungler|jung|jun|jng|jg)$/.test(role)) return "jungle";
  if (/^(mid|middle|midlane|midlaner)$/.test(role)) return "mid";
  if (/^(bot|bottom|botlane|adc|carry)$/.test(role)) return "adc";
  if (/^(support|sup|utility)$/.test(role)) return "support";
  return undefined;
}

export function competitionMatchScore(query: string, candidate: string) {
  const wanted = normalizedLabel(query);
  const found = normalizedLabel(candidate);
  if (!wanted || !found) return 0;
  if (wanted === found) return 100;
  const wantedYear = wanted.match(/\b20\d{2}\b/)?.[0];
  const foundYear = found.match(/\b20\d{2}\b/)?.[0];
  if (wantedYear && foundYear && wantedYear !== foundYear) return 0;
  const wantedTokens = new Set(wanted.split(" "));
  const foundTokens = new Set(found.split(" "));
  const overlap = [...wantedTokens].filter((token) => foundTokens.has(token)).length;
  const coverage = overlap / Math.max(wantedTokens.size, foundTokens.size);
  return coverage >= 0.8 ? Math.round(70 + coverage * 20) : 0;
}

export function isVerifiedPlayoffMatch(match: { Phase?: string; Round?: string; Team1?: string; Team2?: string }) {
  const label = normalizedLabel(`${match.Phase ?? ""} ${match.Round ?? ""}`);
  const playoff = /(^| )(playoff|knockout|quarterfinal|semifinal|grand final|upper|lower|elimination|round of [0-9]+)( |$)/.test(label);
  return playoff && Boolean(match.Team1?.trim() || match.Team2?.trim());
}
