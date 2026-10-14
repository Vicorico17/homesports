export const champions = [
  { name: "Ahri", clues: ["My magic can charm an enemy.", "An orb is my signature weapon.", "I am the Nine-Tailed Fox."] },
  { name: "Ashe", clues: ["I fight with a ranged weapon.", "My arrows carry the cold of the Freljord.", "I am the Frost Archer."] },
  { name: "Jinx", clues: ["I cause chaos with ranged weapons.", "My arsenal includes Fishbones and Pow-Pow.", "I am the Loose Cannon."] },
  { name: "Lux", clues: ["My magic can bind enemies.", "I wield the power of light.", "I am the Lady of Luminosity."] },
  { name: "Yasuo", clues: ["I fight with a blade.", "I can create a wall of wind.", "I am the Unforgiven."] },
  { name: "Thresh", clues: ["I collect souls.", "My lantern can bring an ally to safety.", "I am the Chain Warden."] },
  { name: "Teemo", clues: ["I am a yordle.", "I leave poisonous mushrooms behind.", "I am the Swift Scout."] },
  { name: "Garen", clues: ["I wield a great sword.", "I fight for Demacia.", "I am the Might of Demacia."] },
  { name: "Nami", clues: ["I can heal an ally and hurt an enemy with one spell.", "I summon a tidal wave.", "I am the Tidecaller."] },
  { name: "Braum", clues: ["I protect my allies.", "I carry a huge shield and come from the Freljord.", "I am the Heart of the Freljord."] },
  { name: "Ekko", clues: ["I come from Zaun.", "I can rewind time.", "I am the Boy Who Shattered Time."] },
  { name: "Leona", clues: ["I fight with a sword and shield.", "My power comes from the sun.", "I am the Radiant Dawn."] },
];
export type ChallengeMode = "clues" | "scramble" | "memory";
export const modes: { id: ChallengeMode; name: string; description: string; mark: string }[] = [
  { id: "clues", name: "Champion clues", description: "Three clues. Three guesses. Find the champion.", mark: "?" },
  { id: "scramble", name: "Champion scramble", description: "Untangle the letters. Name the champion in three tries.", mark: "AZ" },
  { id: "memory", name: "Pair patrol", description: "Flip the cards. Find six champion pairs in as few moves as possible.", mark: "◇" },
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
export function dailyChampion(day: string, mode: "clues" | "scramble") { return champions[seedFor(`${day}:${mode}`) % champions.length]; }
export function scramble(name: string, day: string) {
  const letters = name.toUpperCase();
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
