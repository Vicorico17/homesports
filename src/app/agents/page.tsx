import Link from "next/link";
import { publicPages, publicRouteFamilies } from "@/lib/site-discovery";

export const metadata = {
  title: "Agent access",
  description: "Read-only HomeSports match data for AI agents, with source freshness and spoiler controls.",
  alternates: { canonical: "/agents", types: { "text/markdown": "/agents/index.md" } },
};

export default function AgentsPage() {
  return <main className="competition-page">
    <Link href="/">← Back to matches</Link>
    <div className="competition-heading"><div><p className="eyebrow">HOMESPORTS FOR AGENTS</p><h1>A readable map of HomeSports.</h1></div></div>
    <section className="privacy-copy" aria-label="Agent access guide">
      <p>Discover public pages for both games, teams, competitions, Worlds, daily puzzles, and the Twitch prototype. Read-only match JSON includes canonical links, provenance, and freshness. No login required; scores stay hidden unless requested.</p>
      <p><a href="/agents/index.md">Read the Markdown guide</a> · <a href="/api/agent/openapi">OpenAPI contract</a> · <a href="/llms.txt">llms.txt</a> · <a href="/llms-full.txt">Full text guide</a> · <a href="/api/agent/site">JSON route catalog</a> · <a href="/sitemap.xml">Sitemap</a></p>
      <h2>Explore the public site</h2>
      <ul>{publicPages.filter(page => page.path !== "/agents").map(page => <li key={page.path}><Link href={page.path}>{page.title}</Link>: {page.description}</li>)}</ul>
      <h2>Detail pages</h2>
      <ul>{publicRouteFamilies.map(page => <li key={page.path}><strong>{page.title}</strong> ({page.path}): {page.description} {page.reading}</li>)}</ul>
      <p>Follow the match, team, tournament, season, and bracket links returned by the API. The sitemap lists discovered URLs from current non-demo feeds, not every historical page. Team and competition detail pages are readable HTML; they do not yet have dedicated agent JSON APIs. Daily games need JavaScript and keep progress in your browser.</p>
      <h2>Try a request</h2>
      <p><a href="/api/agent/matches?game=lol&amp;status=upcoming&amp;min_importance=4">Important upcoming League matches</a><br />
        <a href="/api/agent/matches?game=valorant&amp;status=running">Running Valorant matches</a><br />
        <a href="/api/agent/matches?game=lol&amp;status=finished&amp;include_results=true">Recent League results (contains scores)</a></p>
      <h2>Freshness is part of the answer</h2>
      <p>Every match response identifies its source, source timestamp, known freshness deadline, demo status, and provider health. Check those fields before reporting a fixture or score. Demo data is illustrative. Degraded data may be incomplete or stale. This is a snapshot of the current board, not a complete schedule or archive. The source timestamp reflects the oldest populated source page when known, not the last-change time of every record. If the freshness deadline has passed, recheck before answering.</p>
      <p>Fetch no faster than once per minute per game. Cite the returned match URL. Times are UTC; translate them to the reader&apos;s timezone. A published stream link does not guarantee the channel is live.</p>
      <h2>ChatGPT and Claude</h2>
      <p>The HTTP API is ready for agents that can fetch URLs. A shared remote MCP connector is planned, but is not installed or available yet. No personal account data or write actions are exposed.</p>
      <p>Provider licensing and redistribution rights must be confirmed before a public connector launch.</p>
    </section>
  </main>;
}
