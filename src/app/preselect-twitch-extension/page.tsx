import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Preselect Twitch Extension",
  description: "Predict each League of Legends champion lock-in live on Twitch and climb the community leaderboard.",
  alternates: { canonical: "/preselect-twitch-extension" },
};

const features = [
  ["Predict the lock-in", "Viewers choose the champion they think a pro team will pick or ban before the timer closes."],
  ["Score every read", "Correct picks, rarity bonuses, and streaks turn champion select into a live community competition."],
  ["Climb together", "Game and series leaderboards keep the watch party engaged across a full best-of-three or best-of-five."],
];

export default function PreselectTwitchExtensionPage() {
  const productUrl = process.env.NEXT_PUBLIC_PRESELECT_URL ?? "https://twitchleagueplugin.vercel.app";

  return <main className="preselect-page">
    <nav className="preselect-topbar"><Link className="brand" href="/"><span>HOME</span>SPORTS</Link><Link href="/">← Match board</Link></nav>

    <section className="preselect-hero">
      <div className="preselect-copy">
        <span className="preselect-kicker">HOMESPORTS LABS · TWITCH EXTENSION</span>
        <h1>PRESELECT</h1>
        <p className="preselect-lead">Call the next champion before the pros lock it in.</p>
        <p>Preselect turns live League of Legends champion select into a prediction game for esports co-streams and watch parties. Everyone votes in Twitch, results reveal with the broadcast, and every correct read builds a score.</p>
        <div className="preselect-actions">
          <a className="preselect-primary" href={productUrl} target="_blank" rel="noreferrer">Open live prototype ↗</a>
          <a href="https://github.com/Vicorico17/preselectTTV" target="_blank" rel="noreferrer">View source ↗</a>
        </div>
      </div>
      <div className="preselect-demo" aria-label="Example live prediction round">
        <span>LIVE · BLUE TEAM PICK 3</span>
        <strong>WHO LOCKS IN NEXT?</strong>
        <div><button type="button">AZIR <small>34%</small></button><button type="button">ORIANNA <small>27%</small></button><button type="button">AHRI <small>21%</small></button></div>
        <p>Voting closes in <b>08</b> seconds</p>
      </div>
    </section>

    <section className="preselect-features" aria-label="How Preselect works">
      {features.map(([title, description], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{description}</p></article>)}
    </section>

    <section className="preselect-details">
      <div><span className="preselect-kicker">MORE INFORMATION</span><h2>Built for live esports, not generic polling.</h2><p>The prediction clock, delayed reveals, broadcast overlay, producer controls, and champion-select automation are designed around the way professional League drafts actually unfold.</p></div>
      <div className="preselect-accordions">
        <details open><summary>What viewers experience <span>+</span></summary><p>A Twitch panel and video overlay with live voting, countdowns, results, streaks, and channel-specific leaderboards. Anonymous viewers can play immediately; linked Twitch identities keep a stable score.</p></details>
        <details><summary>What streamers control <span>+</span></summary><p>A producer desk for creating a series, opening each pick or ban round, confirming the real champion, calibrating stream delay, undoing mistakes, and displaying an OBS-ready overlay.</p></details>
        <details><summary>How automation works <span>+</span></summary><p>Optional on-device screen recognition proposes champion portraits from an authorized broadcast. A moderator must confirm every proposal before predictions resolve, so automation assists rather than takes control.</p></details>
        <details><summary>Current launch status <span>+</span></summary><p>The four product milestones are implemented as a working prototype. Public launch still requires shared production storage, Twitch Extension review, Riot product registration, broadcast rights, security hardening, and load testing.</p></details>
      </div>
    </section>

    <section className="preselect-bottom"><span>READY FOR A WATCH PARTY?</span><h2>Make champion select the first game of the series.</h2><a className="preselect-primary" href={productUrl} target="_blank" rel="noreferrer">Try Preselect ↗</a></section>
  </main>;
}
