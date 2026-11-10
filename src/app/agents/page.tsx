import Link from "next/link";

export const metadata = {
  title: "Agent access",
  description: "Read-only HomeSports match data for AI agents, with source freshness and spoiler controls.",
  alternates: { canonical: "/agents", types: { "text/markdown": "/agents/index.md" } },
};

export default function AgentsPage() {
  return <main className="competition-page">
    <Link href="/">← Back to matches</Link>
    <div className="competition-heading"><div><p className="eyebrow">HOMESPORTS FOR AGENTS</p><h1>A clear view of the matchboard.</h1></div></div>
    <section className="privacy-copy" aria-label="Agent access guide">
      <p>Public League of Legends and Valorant fixtures, status, importance, and stream links. Read-only JSON, no login required, with scores hidden unless requested.</p>
      <p><a href="/agents/index.md">Read the Markdown guide</a> · <a href="/api/agent/openapi">OpenAPI contract</a> · <a href="/llms.txt">llms.txt</a></p>
      <h2>Try a request</h2>
      <p><a href="/api/agent/matches?game=lol&amp;status=upcoming&amp;min_importance=4">Important upcoming League matches</a><br />
        <a href="/api/agent/matches?game=valorant&amp;status=running">Running Valorant matches</a><br />
        <a href="/api/agent/matches?game=lol&amp;status=finished&amp;include_results=true">Recent League results (contains scores)</a></p>
      <h2>Freshness is part of the answer</h2>
      <p>Every response identifies its source, timestamp, demo status, and provider health. Check those fields before reporting a fixture or score. Demo data is illustrative. Degraded data may be incomplete or stale. This is a snapshot of the current board, not a complete schedule or archive.</p>
      <p>Fetch no faster than once per minute per game. Cite the returned match URL. Times are UTC; translate them to the reader&apos;s timezone. A published stream link does not guarantee the channel is live.</p>
      <h2>ChatGPT and Claude</h2>
      <p>The HTTP API is ready for agents that can fetch URLs. A shared remote MCP connector is planned, but is not installed or available yet. No personal account data or write actions are exposed.</p>
      <p>Provider licensing and redistribution rights must be confirmed before a public connector launch.</p>
    </section>
  </main>;
}
