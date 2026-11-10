export const MAX_VIEWERS = 5000;
export const identity = value => typeof value === "string" && /^[A-Za-z0-9:_-]{1,128}$/.test(value);
const object = value => value && typeof value === "object" && !Array.isArray(value);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const text = (value, max = 120) => typeof value === "string" && value.length > 0 && value.length <= max;
const points = ["gameScore", "seriesScore", "correct", "attempts", "streak", "bestStreak"];

function viewer(value, id) {
  return object(value) && value.id === id && identity(id) && !id.startsWith("A") && text(value.name, 24) && points.every(key => integer(value[key], 0, 1_000_000_000));
}

export function validateSnapshot(snapshot, champions, sequence) {
  const invalid = () => { throw new Error("Invalid recovery snapshot. No state was changed."); };
  if (!object(snapshot) || ![1, 2].includes(snapshot.version) || !Array.isArray(snapshot.viewers) || snapshot.viewers.length > MAX_VIEWERS || !Array.isArray(snapshot.actions) || snapshot.actions.length > 20 || !Array.isArray(snapshot.predictions) || snapshot.predictions.length > 21) invalid();
  if (!["setup", "ready", "live", "complete"].includes(snapshot.status) || !integer(snapshot.game, 1, 1000) || !integer(snapshot.currentIndex, 0, 20) || snapshot.actions.length !== snapshot.currentIndex || !integer(snapshot.roundSeconds, 5, 90) || !integer(snapshot.revealDelaySeconds ?? 0, 0, 60) || !integer(snapshot.controlRevision ?? 0, 0, Number.MAX_SAFE_INTEGER)) invalid();
  const match = snapshot.match;
  if (match !== null && (!object(match) || !identity(match.id) || !text(match.seriesName) || !text(match.blueTeam, 80) || !text(match.redTeam, 80) || ![1, 3, 5, 7].includes(match.bestOf))) invalid();
  if (snapshot.status !== "setup" && !match) invalid();
  if (["setup", "ready"].includes(snapshot.status) && (snapshot.round || snapshot.currentIndex !== 0)) invalid();
  if (snapshot.status === "complete" && (snapshot.round || snapshot.currentIndex !== 20)) invalid();
  const ids = new Set();
  for (const item of snapshot.viewers) {
    if (!Array.isArray(item) || item.length !== 2 || ids.has(item[0]) || !viewer(item[1], item[0])) invalid();
    ids.add(item[0]);
  }
  const roundIds = new Set();
  function round(value, index) {
    const expected = sequence[index];
    if (!object(value) || !expected || !identity(value.id) || roundIds.has(value.id) || value.index !== index || value.kind !== expected.kind || value.side !== expected.side || value.slot !== expected.slot || !Number.isFinite(value.openedAt) || !Number.isFinite(value.closesAt) || value.closesAt < value.openedAt) invalid();
    roundIds.add(value.id);
  }
  for (const [index, action] of snapshot.actions.entries()) {
    round(action, index);
    if (!["resolved", "cancelled"].includes(action.status) || !Array.isArray(action.scoreChanges) || action.scoreChanges.length > MAX_VIEWERS) invalid();
    if (action.status === "resolved" && (!champions.includes(action.champion) || !Number.isFinite(action.resolvedAt) || !Number.isFinite(action.revealAt) || action.revealAt < action.resolvedAt || !integer(action.totalVotes, 0, MAX_VIEWERS) || !integer(action.correctVotes, 0, action.totalVotes))) invalid();
    const scored = new Set();
    for (const change of action.scoreChanges) {
      if (!object(change) || !ids.has(change.viewerId) || scored.has(change.viewerId) || !viewer(change.before, change.viewerId) || !integer(change.award, 0, 1000) || typeof change.correct !== "boolean") invalid();
      scored.add(change.viewerId);
    }
  }
  if (snapshot.status === "live") {
    round(snapshot.round, snapshot.currentIndex);
    if (!["open", "closed"].includes(snapshot.round.status)) invalid();
  } else if (snapshot.round !== null) invalid();
  const predictionIds = new Set();
  for (const entry of snapshot.predictions) {
    if (!Array.isArray(entry) || entry.length !== 2 || !roundIds.has(entry[0]) || predictionIds.has(entry[0]) || !Array.isArray(entry[1]) || entry[1].length > MAX_VIEWERS) invalid();
    predictionIds.add(entry[0]);
    const voters = new Set();
    for (const vote of entry[1]) {
      if (!Array.isArray(vote) || vote.length !== 2 || !ids.has(vote[0]) || voters.has(vote[0]) || !champions.includes(vote[1])) invalid();
      voters.add(vote[0]);
    }
  }
  if (snapshot.round && !predictionIds.has(snapshot.round.id)) invalid();
  return structuredClone(snapshot);
}
