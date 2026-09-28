export type Game = "lol" | "valorant";

export function gamePath(game: Game) { return game === "valorant" ? "/valorant" : ""; }
export function gameName(game: Game) { return game === "valorant" ? "Valorant" : "League of Legends"; }
export function followedTeamKey(game: Game, id: number | string) { return game === "valorant" ? `valorant:${id}` : String(id); }

export function rateValorantMatch(value: string) {
  const text = value.toLowerCase();
  const playoff = /playoff|knockout|grand final|semifinal|quarterfinal|\bfinal\b/.test(text);
  const final = /grand final|\bfinal\b/.test(text);
  const international = /\bmasters\b|\bvalorant champions\b(?!\s+tour)|\bvct champions\b|game changers championship/.test(text);
  const vct = /\bvct\b|valorant champions tour|\bamericas\b|\bemea\b|\bpacific\b|\bchina\b/.test(text);
  const stars = international ? (final || playoff ? 5 : 4) : vct ? (final ? 5 : playoff ? 4 : 3) : playoff ? 3 : 2;
  const reason = international ? (playoff || final ? "International playoffs" : "International event") : vct ? (playoff ? "VCT playoffs" : "VCT match") : playoff ? "Regional playoffs" : "Regional match";
  return { stars, reason };
}
