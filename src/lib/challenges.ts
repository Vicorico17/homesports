import { championData, championRoster } from "./champion-data.ts";

export const champions = championData;
export { championRoster };
export type GuessMode = "clues" | "scramble" | "ability" | "title";
export type ChallengeMode = GuessMode | "memory";
export const modes: { id: ChallengeMode; name: string; description: string; mark: string; champion: string }[] = [
  { id: "clues", name: "Champion clues", description: "Three clues. Three guesses. Find the champion.", mark: "?", champion: "Ahri" },
  { id: "scramble", name: "Champion scramble", description: "Untangle the letters. Name the champion in three tries.", mark: "AZ", champion: "Jinx" },
  { id: "memory", name: "Pair patrol", description: "Match champion portraits. Find six pairs in as few moves as possible.", mark: "◇", champion: "Thresh" },
  { id: "ability", name: "Whose ultimate?", description: "An ultimate icon and its name. Which champion casts it?", mark: "R", champion: "Lux" },
  { id: "title", name: "Name that legend", description: "The title is your clue. Name the champion behind it.", mark: "I", champion: "Yasuo" },
];
export function dayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
export function seedFor(value: string) { return [...value].reduce((seed, char) => (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0, 7); }
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function dailyChampion(day: string, mode: GuessMode) { return champions[seedFor(`${day}:${mode}`) % champions.length]; }
export function scramble(name: string, day: string) {
  const letters = normalizeGuess(name).toUpperCase();
  const mixed = shuffle([...letters], seedFor(day)).join("");
  return mixed === letters ? letters.slice(1) + letters[0] : mixed;
}
export function memoryDeck(day: string) {
  const names = shuffle(champions.map(champion => champion.name), seedFor(day)).slice(0, 6);
  return shuffle([...names, ...names], seedFor(`${day}:pairs`));
}
export function normalizeGuess(value: string) { return value.trim().toLowerCase().replace(/[^a-z]/g, ""); }
export type Progress = { guesses: string[]; matched: string[]; moves: number };
export function readProgress(raw: string | null, day: string): Progress {
  const empty = { guesses: [], matched: [], moves: 0 };
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || !Array.isArray(value.guesses) || value.guesses.length > 3 || !value.guesses.every((g: unknown) => typeof g === "string" && g.length <= 40) || !Array.isArray(value.matched) || !value.matched.every((n: unknown) => typeof n === "string" && memoryDeck(day).includes(n)) || !Number.isSafeInteger(value.moves) || value.moves < new Set(value.matched).size) return empty;
    return { guesses: value.guesses, matched: [...new Set<string>(value.matched)], moves: value.moves };
  } catch { return empty; }
}

export function findChampion(value: string) { return championRoster.find(champion => normalizeGuess(champion.name) === normalizeGuess(value)); }
export function portraitPath(name: string) { const champion = champions.find(champion => champion.name === name); return champion ? `/league/champions/${champion.id}.png` : undefined; }
