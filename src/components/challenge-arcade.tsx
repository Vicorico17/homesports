"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { champions, championRoster, dailyChampion, dailyStorageKey, dayKey, resetCountdown, findChampion, memoryDeck, modes, normalizeGuess, portraitPath, readProgress, scramble, type ChallengeMode, type Progress } from "@/lib/challenges";

export function ChallengeArcade() {
  const [now, setNow] = useState<Date | null>(null);
  const day = now ? dayKey(now) : "";
  const [selection, setMode] = useState<ChallengeMode | null>(null);
  const searchParams = useSearchParams();
  const mode = selection ?? modes.find(item => item.id === searchParams.get("game"))?.id ?? "clues";
  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 1_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return <main className="shell arcade">
    <header><Link className="brand" href="/"><span>HOME</span>SPORTS</Link><nav aria-label="Site"><Link href="/">Matches</Link><Link href="/worlds">Worlds 2026</Link><Link href="/calendar">Calendar</Link><Link href="/play" aria-current="page">Daily games</Link></nav></header>
    <section className="arcade-hero"><div className="arcade-hero-copy"><p className="eyebrow">THE PRE-MATCH WARMUP</p><h1>Know your<br /><em>champions.</em></h1><p>From Ahri’s charm to Lux’s ultimate. Five daily games to test your champion knowledge before the next series.</p><div className="arcade-daily-reset"><span className="arcade-date">{day || "Daily challenges"} · New puzzles at 00:00 UTC</span><span className="arcade-reset-clock" role="timer" aria-live="off">Next reset <strong>{now ? resetCountdown(now) : "--:--:--"}</strong></span></div><p className="arcade-daily-rule">One challenge per game, per day. Everyone gets the same puzzles. Come back tomorrow for a new set.</p><p className="arcade-roster-count">{champions.length} champions · Portraits, ultimates & lore titles · Free to play</p></div><div className="arcade-champion-lineup" aria-label="Featured League champions">{["Ahri", "Jinx", "Yasuo", "Lux", "Ekko"].map(name => <figure key={name}><img src={portraitPath(name)} alt="" width={120} height={120} /><figcaption>{name}</figcaption></figure>)}</div></section>
    <div className="arcade-modes" aria-label="Choose a daily game">{modes.map(item => <button key={item.id} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}><span className="arcade-mode-art" aria-hidden="true"><img src={`/league/champions/${item.champion}.png`} alt="" width={56} height={56} /><b>{item.mark}</b></span><span><strong>{item.name}</strong><span>{item.description}</span></span><span aria-hidden="true">↗</span></button>)}</div>
    {day ? <DailyGame key={`${day}:${mode}`} day={day} mode={mode} /> : <p role="status">Loading today’s games…</p>}
    <section className="arcade-next"><div><p className="eyebrow">FROM CHAMPION KNOWLEDGE TO CHAMPIONSHIP MOMENTS</p><h2>Your next move? Catch a real match.</h2><p>Find a series worth watching, open a team page, and follow their schedule.</p></div><Link href="/calendar" onClick={() => track("Game Calendar Clicked", { mode })}>Find my next match →</Link></section>
    <p className="arcade-note">Progress stays in this browser. Clearing site data resets it. No email required.</p>
  </main>;
}

function DailyGame({ day, mode }: { day: string; mode: ChallengeMode }) {
  const storageKey = dailyStorageKey(day, mode);
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
  const champion = dailyChampion(day, mode === "memory" ? "clues" : mode);
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
    if (finished || day !== dayKey()) return;
    const selected = findChampion(guess);
    if (!selected) { setMessage("Choose a League champion from the suggestions. This does not use a guess."); return; }
    const value = selected.name;
    if (progress.guesses.some(previous => normalizeGuess(previous) === normalizeGuess(value))) { setMessage("You already tried that champion. Try another."); return; }
    const correct = normalizeGuess(value) === normalizeGuess(champion.name);
    const next = { ...progress, guesses: [...progress.guesses, value] };
    save(next); setGuess("");
    setMessage(correct ? "Correct! You found the champion." : next.guesses.length === 3 ? "No guesses left today." : "Not quite. Try again.");
    if (correct || next.guesses.length === 3) track("Daily Game Completed", { mode, won: correct });
  }
  function flip(index: number) {
    if (day !== dayKey() || finished || flipped.length === 2 || flipped.includes(index) || progress.matched.includes(deck[index])) return;
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
    const text = `HomeSports · ${modes.find(item => item.id === mode)!.name}\n${day} · ${score}\n${won ? "🟩" : "⬛"}\nPlay today: ${window.location.origin}/play?game=${mode}`;
    try { await navigator.clipboard.writeText(text); setMessage("Result copied. Send it to your duo!"); }
    catch { setShareText(text); setMessage("Copy your result below to share it."); }
  }
  return <section className="arcade-panel" aria-labelledby="daily-title"><div className="arcade-panel-heading"><div><p className="eyebrow">DAILY CHALLENGE · {day}</p><h2 id="daily-title">{modes.find(item => item.id === mode)!.name}</h2></div><span>{mode === "memory" ? `${progress.matched.length}/6 pairs · ${progress.moves} moves` : `${progress.guesses.length}/3 guesses`}</span></div>
    <>
      {mode === "clues" && <ol className="arcade-clues">{champion.clues.map((clue, index) => <li key={clue}><b>0{index + 1}</b><span>{finished || index <= progress.guesses.length ? clue : "Revealed after your next guess"}</span></li>)}</ol>}
      {mode === "scramble" && <div className="arcade-scramble"><p>UNSCRAMBLE THIS CHAMPION</p><strong aria-label={`Letters: ${scramble(champion.name, day).split("").join(", ")}`}>{scramble(champion.name, day)}</strong><p>{normalizeGuess(champion.name).length} letters · Three attempts</p></div>}
      {mode === "ability" && <div className="arcade-ability"><img src={`/league/abilities/${champion.id}.png`} alt="Today’s ultimate ability icon" width={88} height={88} /><div><p className="eyebrow">R · ULTIMATE ABILITY</p><h3>{champion.ability.name}</h3><p>Which champion uses this ultimate?</p></div></div>}
      {mode === "title" && <div className="arcade-title-quiz"><p className="eyebrow">WHO IS KNOWN AS…</p><blockquote>“{champion.title}”</blockquote><p>Name the champion behind the title.</p></div>}
      {mode !== "memory" && mode !== "clues" && !finished && progress.guesses.length > 0 && <p className="arcade-hint">Hint: {champion.roles.join(" / ")}{progress.guesses.length > 1 && champion.region ? ` · Associated with ${champion.region}` : ""}</p>}
      {mode === "memory" ? <div className="arcade-memory">{deck.map((name, index) => { const matched = progress.matched.includes(name); const visible = matched || flipped.includes(index); return <button key={index} className={matched ? "matched" : visible ? "flipped" : ""} disabled={matched || finished || flipped.includes(index) || flipped.length === 2} aria-label={`Card ${index + 1}${visible ? `: ${name}${matched ? ", matched" : ""}` : ": face down"}`} onClick={() => flip(index)}>{visible ? <><img src={portraitPath(name)} alt="" width={80} height={80} /><span className="arcade-card-name">{name}</span></> : <span aria-hidden="true">✦</span>}</button>; })}</div> : <>
        {progress.guesses.length > 0 && <ul className="arcade-guesses" aria-label="Previous guesses">{progress.guesses.map(value => <li key={value}><span className="arcade-guessed-champion">{portraitPath(value) && <img src={portraitPath(value)} alt="" width={32} height={32} />}{value}</span><span>{normalizeGuess(value) === normalizeGuess(champion.name) ? "Correct ✓" : "Incorrect ×"}</span></li>)}</ul>}
        {!finished && <form className="arcade-form" onSubmit={submit}><label htmlFor="champion-guess">Champion name<input id="champion-guess" list="champion-roster" autoComplete="off" maxLength={40} value={guess} onChange={event => setGuess(event.target.value)} placeholder="Search a champion…" required /><datalist id="champion-roster">{championRoster.map(item => <option key={item.id} value={item.name} />)}</datalist></label><button type="submit">Lock in →</button></form>}
      </>}
      {finished && <div className="arcade-result">{mode !== "memory" && <div className="arcade-champion-reveal"><img src={portraitPath(champion.name)} alt={champion.name} width={96} height={96} /><div><strong>{champion.name}</strong><p>{champion.title}</p><small>{champion.roles.join(" / ")}{champion.region ? ` · ${champion.region}` : ""}</small></div></div>}<h3>{won ? "Well played." : "Next game, new chance."}</h3><p>{mode === "memory" ? `All six pairs found in ${progress.moves} moves.` : `Today’s champion was ${champion.name}.`} Come back tomorrow for a fresh challenge.</p><button onClick={share}>Copy result to challenge a friend ↗</button>{shareText && <label>Share your result<textarea readOnly value={shareText} onFocus={event => event.target.select()} /></label>}</div>}
    </>
    <p className="arcade-message" role="status">{message}</p>
  </section>;
}
