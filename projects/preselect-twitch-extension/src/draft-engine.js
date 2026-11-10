import { randomUUID } from "node:crypto";
import { identity, MAX_VIEWERS, validateSnapshot } from "./snapshot-validation.js";

export const CHAMPIONS = [
  "Aatrox", "Ahri", "Akali", "Akshan", "Alistar", "Ambessa", "Amumu", "Anivia", "Annie", "Aphelios",
  "Ashe", "Aurelion Sol", "Aurora", "Azir", "Bard", "Bel'Veth", "Blitzcrank", "Brand", "Braum", "Briar",
  "Caitlyn", "Camille", "Cassiopeia", "Cho'Gath", "Corki", "Darius", "Diana", "Dr. Mundo", "Draven", "Ekko",
  "Elise", "Evelynn", "Ezreal", "Fiddlesticks", "Fiora", "Fizz", "Galio", "Gangplank", "Garen", "Gnar",
  "Gragas", "Graves", "Gwen", "Hecarim", "Heimerdinger", "Hwei", "Illaoi", "Irelia", "Ivern", "Janna",
  "Jarvan IV", "Jax", "Jayce", "Jhin", "Jinx", "K'Sante", "Kai'Sa", "Kalista", "Karma", "Karthus",
  "Kassadin", "Katarina", "Kayle", "Kayn", "Kennen", "Kha'Zix", "Kindred", "Kled", "Kog'Maw", "LeBlanc",
  "Lee Sin", "Leona", "Lillia", "Lissandra", "Locke", "Lucian", "Lulu", "Lux", "Malphite", "Malzahar", "Maokai",
  "Master Yi", "Mel", "Milio", "Miss Fortune", "Mordekaiser", "Morgana", "Naafiri", "Nami", "Nasus", "Nautilus",
  "Neeko", "Nidalee", "Nilah", "Nocturne", "Nunu & Willump", "Olaf", "Orianna", "Ornn", "Pantheon", "Poppy",
  "Pyke", "Qiyana", "Quinn", "Rakan", "Rammus", "Rek'Sai", "Rell", "Renata Glasc", "Renekton", "Rengar",
  "Riven", "Rumble", "Ryze", "Samira", "Sejuani", "Senna", "Seraphine", "Sett", "Shaco", "Shen",
  "Shyvana", "Singed", "Sion", "Sivir", "Skarner", "Smolder", "Sona", "Soraka", "Swain", "Sylas",
  "Syndra", "Tahm Kench", "Taliyah", "Talon", "Taric", "Teemo", "Thresh", "Tristana", "Trundle", "Tryndamere",
  "Twisted Fate", "Twitch", "Udyr", "Urgot", "Varus", "Vayne", "Veigar", "Vel'Koz", "Vex", "Vi",
  "Viego", "Viktor", "Vladimir", "Volibear", "Warwick", "Wukong", "Xayah", "Xerath", "Xin Zhao", "Yasuo",
  "Yone", "Yorick", "Yunara", "Yuumi", "Zaahen", "Zac", "Zed", "Zeri", "Ziggs", "Zilean", "Zoe", "Zyra"
];

export const DRAFT_SEQUENCE = [
  ["ban", "blue", 1], ["ban", "red", 1], ["ban", "blue", 2], ["ban", "red", 2], ["ban", "blue", 3], ["ban", "red", 3],
  ["pick", "blue", 1], ["pick", "red", 1], ["pick", "red", 2], ["pick", "blue", 2], ["pick", "blue", 3], ["pick", "red", 3],
  ["ban", "red", 4], ["ban", "blue", 4], ["ban", "red", 5], ["ban", "blue", 5],
  ["pick", "red", 4], ["pick", "blue", 4], ["pick", "blue", 5], ["pick", "red", 5]
].map(([kind, side, slot], index) => ({ index, kind, side, slot }));

const freshViewer = (id, name) => ({
  id, name, gameScore: 0, seriesScore: 0, correct: 0, attempts: 0, streak: 0, bestStreak: 0
});

export class DraftEngine {
  constructor({ now = () => Date.now(), roundSeconds = 20, revealDelaySeconds = 7 } = {}) {
    this.now = now;
    this.roundSeconds = roundSeconds;
    this.revealDelaySeconds = revealDelaySeconds;
    this.viewers = new Map();
    this.predictions = new Map();
    this.setup();
    this.controlRevision = 0;
  }

  setup() {
    this.match = null;
    this.game = 1;
    this.status = "setup";
    this.currentIndex = 0;
    this.round = null;
    this.actions = [];
  }

  createMatch({ seriesName, blueTeam, redTeam, bestOf = 3, roundSeconds, revealDelaySeconds, template = "standard" }) {
    if (typeof blueTeam !== "string" || typeof redTeam !== "string" || !blueTeam.trim() || !redTeam.trim() || blueTeam.length > 80 || redTeam.length > 80) throw new Error("Both team names are required (maximum 80 characters).");
    if (seriesName !== undefined && (typeof seriesName !== "string" || seriesName.length > 120)) throw new Error("Series name must contain at most 120 characters.");
    if (![1, 3, 5, 7].includes(Number(bestOf))) throw new Error("Best of must be 1, 3, 5, or 7.");
    if (!["standard", "rapid", "analysis", "international"].includes(template)) throw new Error("Unknown match template.");
    const settings = this.validSettings({ roundSeconds, revealDelaySeconds });
    this.match = {
      id: randomUUID(),
      seriesName: seriesName?.trim() || "Live series",
      blueTeam: blueTeam.trim(),
      redTeam: redTeam.trim(),
      bestOf: Number(bestOf),
      template
    };
    Object.assign(this, settings);
    this.game = 1;
    this.status = "ready";
    this.currentIndex = 0;
    this.round = null;
    this.actions = [];
    this.predictions.clear();
    for (const viewer of this.viewers.values()) Object.assign(viewer, freshViewer(viewer.id, viewer.name));
    return this.publicState();
  }

  configure({ roundSeconds, revealDelaySeconds }) {
    Object.assign(this, this.validSettings({ roundSeconds, revealDelaySeconds }));
    return { roundSeconds: this.roundSeconds, revealDelaySeconds: this.revealDelaySeconds };
  }

  validSettings({ roundSeconds, revealDelaySeconds }) {
    const settings = {};
    for (const [key, value, min, max] of [["roundSeconds", roundSeconds, 5, 90], ["revealDelaySeconds", revealDelaySeconds, 0, 60]]) {
      if (value === undefined) continue;
      if (!Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max || value === "" || value === null) throw new Error(`${key} must be an integer from ${min} to ${max}.`);
      settings[key] = Number(value);
    }
    return settings;
  }

  clearSeries() {
    this.setup();
    this.predictions.clear();
    for (const viewer of this.viewers.values()) Object.assign(viewer, freshViewer(viewer.id, viewer.name));
  }

  join(id, name) {
    if (!identity(id)) throw new Error("Invalid viewer identity.");
    if (!this.viewers.has(id) && this.viewers.size >= MAX_VIEWERS) throw new Error("This channel has reached the supported viewer limit.");
    if (name !== undefined && typeof name !== "string") throw new Error("Display name must be text.");
    const cleanName = String(name || "Analyst").trim().slice(0, 24) || "Analyst";
    const existing = this.viewers.get(id);
    if (existing) existing.name = cleanName;
    else this.viewers.set(id, freshViewer(id, cleanName));
    return this.viewers.get(id);
  }

  startDraft() {
    if (!this.match) throw new Error("Create a match first.");
    if (!["ready", "complete"].includes(this.status)) throw new Error("The draft is already live.");
    if (this.status === "complete") this.newGame();
    this.status = "live";
    this.currentIndex = 0;
    this.actions = [];
    this.openRound();
  }

  newGame() {
    if (!this.match) throw new Error("Create a match first.");
    if (this.game >= 1000) throw new Error("Start a new series before adding another game.");
    this.game += 1;
    this.status = "ready";
    this.currentIndex = 0;
    this.round = null;
    this.actions = [];
    this.predictions.clear();
    for (const viewer of this.viewers.values()) {
      viewer.gameScore = 0;
      viewer.correct = 0;
      viewer.attempts = 0;
      viewer.streak = 0;
      viewer.bestStreak = 0;
    }
  }

  openRound() {
    const action = DRAFT_SEQUENCE[this.currentIndex];
    if (!action) {
      this.status = "complete";
      this.round = null;
      return;
    }
    const openedAt = this.now();
    this.round = {
      id: randomUUID(), ...action, status: "open", openedAt,
      closesAt: openedAt + this.roundSeconds * 1000
    };
    this.predictions.set(this.round.id, new Map());
  }

  closeExpired() {
    if (this.round?.status === "open" && this.now() >= this.round.closesAt) this.round.status = "closed";
  }

  predict(viewerId, champion) {
    this.closeExpired();
    if (!this.viewers.has(viewerId)) throw new Error("Join before predicting.");
    if (!this.round || this.round.status !== "open") throw new Error("Voting is closed.");
    if (!CHAMPIONS.includes(champion)) throw new Error("Unknown champion.");
    this.predictions.get(this.round.id).set(viewerId, champion);
  }

  resolve(champion) {
    if (!this.round || !["open", "closed"].includes(this.round.status)) throw new Error("There is no round to resolve.");
    if (!CHAMPIONS.includes(champion)) throw new Error("Unknown champion.");
    const votes = this.predictions.get(this.round.id) || new Map();
    const totalVotes = votes.size;
    const correctVotes = [...votes.values()].filter(value => value === champion).length;
    const base = this.round.kind === "pick" ? 100 : 75;
    const rarityBonus = correctVotes ? Math.round((1 - correctVotes / Math.max(totalVotes, 1)) * 50) : 0;
    const scoreChanges = [];

    for (const [viewerId, viewer] of this.viewers) {
      const prediction = votes.get(viewerId);
      if (!prediction) continue;
      const before = { ...viewer };
      viewer.attempts += 1;
      let award = 0;
      if (prediction === champion) {
        const streakBonus = Math.min(viewer.streak * 20, 100);
        award = base + rarityBonus + streakBonus;
        viewer.correct += 1;
        viewer.streak += 1;
        viewer.bestStreak = Math.max(viewer.bestStreak, viewer.streak);
        viewer.gameScore += award;
        viewer.seriesScore += award;
      } else {
        viewer.streak = 0;
      }
      scoreChanges.push({ viewerId, before, award, correct: prediction === champion });
    }

    const resolvedAt = this.now();
    this.actions.push({
      ...this.round, status: "resolved", champion, totalVotes, correctVotes, base, rarityBonus,
      resolvedAt, revealAt: resolvedAt + this.revealDelaySeconds * 1000, scoreChanges
    });
    this.currentIndex += 1;
    this.openRound();
  }

  cancelRound() {
    if (!this.round) throw new Error("There is no active round.");
    this.actions.push({ ...this.round, status: "cancelled", scoreChanges: [] });
    this.currentIndex += 1;
    this.openRound();
  }

  undoLast() {
    const last = this.actions.pop();
    if (!last) throw new Error("There is no completed action to undo.");
    for (const change of last.scoreChanges || []) {
      const viewer = this.viewers.get(change.viewerId);
      if (viewer) Object.assign(viewer, change.before);
    }
    this.currentIndex = last.index;
    this.status = "live";
    const retained = new Set(this.actions.map(action => action.id));
    this.predictions = new Map([...this.predictions].filter(([id]) => retained.has(id)));
    this.openRound();
  }

  resetGame() {
    if (!this.match) throw new Error("Create a match first.");
    for (const viewer of this.viewers.values()) {
      viewer.seriesScore = Math.max(0, viewer.seriesScore - viewer.gameScore);
      viewer.gameScore = 0;
      viewer.correct = 0;
      viewer.attempts = 0;
      viewer.streak = 0;
      viewer.bestStreak = 0;
    }
    this.currentIndex = 0;
    this.actions = [];
    this.predictions.clear();
    this.round = null;
    this.status = "ready";
  }

  voteBreakdown() {
    if (!this.round) return [];
    const votes = this.predictions.get(this.round.id) || new Map();
    const counts = new Map();
    for (const champion of votes.values()) counts.set(champion, (counts.get(champion) || 0) + 1);
    return [...counts].map(([champion, votes]) => ({ champion, votes, percentage: Math.round(votes / Math.max(1, counts.size ? [...counts.values()].reduce((a, b) => a + b, 0) : 1) * 100) }))
      .sort((a, b) => b.votes - a.votes || a.champion.localeCompare(b.champion));
  }

  snapshot() {
    return {
      version: 2, savedAt: this.now(), match: this.match, game: this.game, status: this.status,
      currentIndex: this.currentIndex, round: this.round, actions: this.actions,
      roundSeconds: this.roundSeconds, revealDelaySeconds: this.revealDelaySeconds, controlRevision: this.controlRevision,
      viewers: [...this.viewers.entries()],
      predictions: [...this.predictions.entries()].map(([roundId, votes]) => [roundId, [...votes.entries()]])
    };
  }

  restore(snapshot) {
    snapshot = validateSnapshot(snapshot, CHAMPIONS, DRAFT_SEQUENCE);
    this.match = snapshot.match || null;
    this.game = Number(snapshot.game) || 1;
    this.status = snapshot.status || "setup";
    this.currentIndex = Number(snapshot.currentIndex) || 0;
    this.round = snapshot.round || null;
    this.actions = Array.isArray(snapshot.actions) ? snapshot.actions : [];
    this.roundSeconds = Number(snapshot.roundSeconds) || 20;
    this.revealDelaySeconds = Number(snapshot.revealDelaySeconds) || 0;
    this.controlRevision = snapshot.controlRevision ?? 0;
    this.viewers = new Map(snapshot.viewers);
    this.predictions = new Map((snapshot.predictions || []).map(([roundId, votes]) => [roundId, new Map(votes)]));
    return this.publicState(null, { producer: true });
  }

  publicState(viewerId, { producer = false } = {}) {
    this.closeExpired();
    const now = this.now();
    const votes = this.round ? this.predictions.get(this.round.id) : null;
    const visibleViewers = new Map([...this.viewers].map(([id, viewer]) => [id, { ...viewer }]));
    if (!producer) {
      for (const action of [...this.actions].reverse()) {
        if (action.status !== "resolved" || !action.revealAt || now >= action.revealAt) continue;
        for (const change of action.scoreChanges || []) {
          const viewer = visibleViewers.get(change.viewerId);
          if (viewer) Object.assign(viewer, change.before);
        }
      }
    }
    const rankedViewers = [...visibleViewers.values()]
      .sort((a, b) => b.seriesScore - a.seriesScore || b.gameScore - a.gameScore || a.name.localeCompare(b.name))
      .map(({ id, name, gameScore, seriesScore, correct, attempts, streak, bestStreak }) =>
        ({ id, name, gameScore, seriesScore, correct, attempts, streak, bestStreak }));
    const leaderboard = rankedViewers.map(({ id, ...viewer }) => ({ ...viewer, isMe: Boolean(viewerId && id === viewerId) }));
    const actions = this.actions.map(({ scoreChanges, ...action }) => {
      if (producer || action.status !== "resolved" || !action.revealAt || now >= action.revealAt) return action;
      const { champion, correctVotes, rarityBonus, ...hidden } = action;
      return { ...hidden, champion: null, hiddenUntil: action.revealAt };
    });
    const lastAction = actions.at(-1) || null;
    return {
      match: this.match,
      game: this.game,
      controlRevision: this.controlRevision,
      status: this.status,
      roundSeconds: this.roundSeconds,
      revealDelaySeconds: this.revealDelaySeconds,
      round: this.round ? { ...this.round, voteCount: votes?.size || 0 } : null,
      voteBreakdown: this.voteBreakdown(),
      myPrediction: viewerId && votes ? votes.get(viewerId) || null : null,
      me: viewerId ? leaderboard.find(viewer => viewer.isMe) || null : null,
      actions,
      lastAction,
      leaderboard: leaderboard.slice(0, 100),
      viewerCount: leaderboard.length,
      champions: CHAMPIONS
    };
  }
}
