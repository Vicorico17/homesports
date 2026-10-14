"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { dailyChampion, dayKey, memoryDeck, modes, normalizeGuess, readProgress, scramble, type ChallengeMode, type Progress } from "@/lib/challenges";

export function ChallengeArcade() {
  const [day, setDay] = useState("");
  const [mode, setMode] = useState<ChallengeMode>("clues");
  useEffect(() => {
    const refresh = () => setDay(dayKey());
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return <main className="shell arcade">
    <header><Link className="brand" href="/"><span>HOME</span>SPORTS</Link><nav aria-label="Site"><Link href="/">Matches</Link><Link href="/calendar">Calendar</Link><Link href="/play" aria-current="page">Daily games</Link></nav></header>
    <section className="arcade-hero"><p className="eyebrow">THE PRE-MATCH WARMUP</p><h1>Small games.<br /><em>Big brain energy.</em></h1><p>Put your League knowledge to the test. Three free games, a fresh challenge every day, and no account needed.</p><span className="arcade-date">{day || "Daily challenges"} · Resets at 00:00 UTC</span></section>
    <div className="arcade-modes" aria-label="Choose a daily game">{modes.map(item => <button key={item.id} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}><span className="arcade-mark" aria-hidden="true">{item.mark}</span><span><strong>{item.name}</strong><span>{item.description}</span></span><span aria-hidden="true">↗</span></button>)}</div>
    {day ? <DailyGame key={`${day}:${mode}`} day={day} mode={mode} /> : <p role="status">Loading today’s games…</p>}
    <section className="arcade-next"><div><p className="eyebrow">FROM CHAMPION KNOWLEDGE TO CHAMPIONSHIP MOMENTS</p><h2>Your next move? Catch a real match.</h2><p>Find a series worth watching, open a team page, and follow their schedule.</p></div><Link href="/calendar" onClick={() => track("Game Calendar Clicked", { mode })}>Find my next match →</Link></section>
    <p className="arcade-note">Progress stays in this browser. Clearing site data resets it. No email required.</p>
  </main>;
}

function DailyGame({ day, mode }: { day: string; mode: ChallengeMode }) {
  const storageKey = `homesports:daily:v1:${day}:${mode}`;
  // This keyed component mounts only after the parent resolves the day on the client.
  const [initial] = useState(() => {
    try { return { progress: readProgress(localStorage.getItem(storageKey), day), message: "" }; }
    catch { return { progress: readProgress(null, day), message: "Browser storage is unavailable. You can still play this session." }; }
  });
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState(initial.message);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [shareText, setShareText] = useState("");
  const champion = dailyChampion(day, mode === "scramble" ? "scramble" : "clues");
  const deck = memoryDeck(day);
  const won = mode === "memory" ? progress.matched.length === 6 : progress.guesses.some(value => normalizeGuess(value) === normalizeGuess(champion.name));
  const finished = won || (mode !== "memory" && progress.guesses.length >= 3);
  useEffect(() => {
    if (flipped.length !== 2) return;
    const timer = window.setTimeout(() => setFlipped([]), 900);
    return () => window.clearTimeout(timer);
  }, [flipped]);
  function save(next: Progress) {
    setProgress(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { setMessage("Your progress could not be saved in this browser."); }
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (finished) return;
    const value = guess.trim();
    if (!normalizeGuess(value)) { setMessage("Enter a champion name."); return; }
    if (progress.guesses.some(previous => normalizeGuess(previous) === normalizeGuess(value))) { setMessage("You already tried that champion. Try another."); return; }
    const correct = normalizeGuess(value) === normalizeGuess(champion.name);
    const next = { ...progress, guesses: [...progress.guesses, value] };
    save(next); setGuess("");
    setMessage(correct ? "Correct! You found the champion." : next.guesses.length === 3 ? "No guesses left today." : "Not quite. Try again.");
    if (correct || next.guesses.length === 3) track("Daily Game Completed", { mode, won: correct });
  }
  function flip(index: number) {
    if (finished || flipped.length === 2 || flipped.includes(index) || progress.matched.includes(deck[index])) return;
    const next = [...flipped, index]; setFlipped(next);
    if (next.length === 2) {
      const match = deck[next[0]] === deck[index];
      const matched = match ? [...progress.matched, deck[index]] : progress.matched;
      save({ ...progress, moves: progress.moves + 1, matched });
      setMessage(match ? `${deck[index]} pair found.` : "No match. The cards will turn back over.");
      if (matched.length === 6) track("Daily Game Completed", { mode, won: true });
    }
  }
  async function share() {
    const score = mode === "memory" ? `${progress.moves} moves` : won ? `${progress.guesses.length}/3 guesses` : "X/3 guesses";
    const text = `HomeSports · ${modes.find(item => item.id === mode)!.name}\n${day} · ${score}\n${won ? "🟩" : "⬛"}\nPlay today: ${window.location.origin}/play`;
    try { await navigator.clipboard.writeText(text); setMessage("Result copied. Send it to your duo!"); }
    catch { setShareText(text); setMessage("Copy your result below to share it."); }
  }
  return <section className="arcade-panel" aria-labelledby="daily-title"><div className="arcade-panel-heading"><div><p className="eyebrow">TODAY’S CHALLENGE</p><h2 id="daily-title">{modes.find(item => item.id === mode)!.name}</h2></div><span>{mode === "memory" ? `${progress.matched.length}/6 pairs · ${progress.moves} moves` : `${progress.guesses.length}/3 guesses`}</span></div>
    <>
      {mode === "clues" && <ol className="arcade-clues">{champion.clues.map((clue, index) => <li key={clue}><b>0{index + 1}</b><span>{finished || index <= progress.guesses.length ? clue : "Revealed after your next guess"}</span></li>)}</ol>}
      {mode === "scramble" && <div className="arcade-scramble"><p>UNSCRAMBLE THIS CHAMPION</p><strong aria-label={`Letters: ${scramble(champion.name, day).split("").join(", ")}`}>{scramble(champion.name, day)}</strong><p>{champion.name.length} letters · Three attempts</p></div>}
      {mode === "memory" ? <div className="arcade-memory">{deck.map((name, index) => { const matched = progress.matched.includes(name); const visible = matched || flipped.includes(index); return <button key={index} className={matched ? "matched" : visible ? "flipped" : ""} disabled={matched || finished || flipped.includes(index) || flipped.length === 2} aria-label={`Card ${index + 1}${visible ? `: ${name}${matched ? ", matched" : ""}` : ": face down"}`} onClick={() => flip(index)}>{visible ? name : <span aria-hidden="true">✦</span>}</button>; })}</div> : <>
        {progress.guesses.length > 0 && <ul className="arcade-guesses" aria-label="Previous guesses">{progress.guesses.map(value => <li key={value}>{value}<span>{normalizeGuess(value) === normalizeGuess(champion.name) ? "Correct ✓" : "Incorrect ×"}</span></li>)}</ul>}
        {!finished && <form className="arcade-form" onSubmit={submit}><label htmlFor="champion-guess">Champion name<input id="champion-guess" autoComplete="off" maxLength={40} value={guess} onChange={event => setGuess(event.target.value)} placeholder="Type your guess…" required /></label><button type="submit">Lock in →</button></form>}
      </>}
      {finished && <div className="arcade-result"><h3>{won ? "Well played." : "Next game, new chance."}</h3><p>{mode === "memory" ? `All six pairs found in ${progress.moves} moves.` : `Today’s champion was ${champion.name}.`} Come back tomorrow for a fresh challenge.</p><button onClick={share}>Copy result to challenge a friend ↗</button>{shareText && <label>Share your result<textarea readOnly value={shareText} onFocus={event => event.target.select()} /></label>}</div>}
    </>
    <p className="arcade-message" role="status">{message}</p>
  </section>;
}
