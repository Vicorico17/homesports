import type { Metadata } from "next";
import type { MatchFeed } from "./matches.ts";
import { siteOrigin } from "./agent-access.ts";
import { publicTournamentId } from "./public-links.ts";

// One inventory for the guide, JSON catalog, sitemap and static page metadata.
// Describes public capabilities, never browser-local progress or account data.
export const publicPages = [
  { path: "/", title: "League of Legends matches", description: "Live and upcoming League of Legends series, ranked by editorial importance, with a Worlds spotlight.", reading: "Server-rendered matchboard; filters and refresh use JavaScript. Use the match API for a bounded snapshot." },
  { path: "/live", title: "Live League of Legends matches", description: "Running League of Legends series and provider-listed broadcast links.", reading: "Status is a provider snapshot, not proof that a stream is currently online." },
  { path: "/results", title: "League of Legends results", description: "Recent completed League of Legends series.", reading: "Results page; may contain spoilers. API scores require include_results=true." },
  { path: "/calendar", title: "League of Legends match calendar", description: "Public League of Legends schedule in a calendar or mobile agenda.", reading: "Initial times are UTC; JavaScript changes them to device-local time. Not a complete schedule archive." },
  { path: "/worlds", title: "Worlds 2026 schedule and stages", description: "Published Worlds 2026 fixtures, Swiss records, and tournament brackets.", reading: "Read the source-quality notice. Coverage may be partial. Scores start hidden, but standings and bracket progression may reveal outcomes. No dedicated agent JSON API." },
  { path: "/valorant", title: "Valorant esports matches", description: "Live and upcoming Valorant series, ranked by editorial importance.", reading: "Server-rendered matchboard; use game=valorant in the match API. No live round telemetry." },
  { path: "/valorant/live", title: "Live Valorant matches", description: "Running Valorant series and provider-listed broadcast links.", reading: "A published link does not independently verify that a channel is live." },
  { path: "/valorant/results", title: "Valorant results", description: "Recent completed Valorant series.", reading: "Results page; may contain spoilers. API scores require include_results=true." },
  { path: "/valorant/calendar", title: "Valorant match calendar", description: "Public Valorant schedule in a calendar or mobile agenda.", reading: "Initial times are UTC; JavaScript changes them to device-local time. Not a complete schedule archive." },
  { path: "/play", title: "Daily LoL games", description: "Five daily League of Legends champion puzzles: clues, scrambles, portrait pairs, ultimate identification, and champion titles.", reading: "Interactive gameplay requires JavaScript. Puzzles rotate at 00:00 UTC. Progress stays in the browser. No agent gameplay or personal-progress API." },
  { path: "/preselect-twitch-extension", title: "Preselect Twitch Extension", description: "Product overview of a champion-select prediction prototype for Twitch co-streams.", reading: "Prototype description, not a released Twitch Extension or a HomeSports agent action. No prediction or moderation API is exposed here." },
  { path: "/privacy", title: "Privacy", description: "HomeSports analytics, browser-local storage, public feeds, and support information.", reading: "Server-rendered policy page. Do not send private information to the public support tracker." },
  { path: "/agents", title: "Agent access", description: "Site-wide discovery and read-only public match data for AI agents, including provenance, limitations, and spoiler controls.", reading: "Start with the Markdown guide or JSON route catalog. No login, credentials, or write operations." },
] as const;

export const publicRouteFamilies = [
  { path: "/match/{id}?game={game}", title: "Match preview", description: "Teams, provider status, recent form, transparent win estimates when supported, tournament squads, and live stream links.", reading: "Use a match id and game returned by the match API. Tournament squads are not confirmed match starters; form estimates are uncalibrated heuristics. Detail data may be unavailable independently of the board." },
  { path: "/teams/{id}", title: "League of Legends team", description: "Provider-listed current team members and available match history.", reading: "Current membership is distinct from tournament squads. Missing or quarantined rosters are not proof of an empty roster." },
  { path: "/valorant/teams/{id}", title: "Valorant team", description: "Provider-listed current team members and available match history.", reading: "Current membership is distinct from tournament squads. Missing or quarantined rosters are not proof of an empty roster." },
  { path: "/competition/{id}", title: "League of Legends tournament", description: "Published tournament fixtures, standings, results, and bracket.", reading: "May contain spoilers. Read local provenance and fallback notices. Provider records and inferred standings are not interchangeable." },
  { path: "/valorant/competition/{id}", title: "Valorant tournament", description: "Published tournament fixtures, standings, results, and bracket.", reading: "May contain spoilers. Missing provider data does not establish that no fixtures exist." },
  { path: "/competition/series/{id}", title: "League of Legends season", description: "Available season fixtures, results, standings, and stage links.", reading: "May contain spoilers. This page can include history outside the bounded matchboard API; it does not guarantee a complete archive." },
  { path: "/valorant/competition/series/{id}", title: "Valorant season", description: "Available season fixtures, results, standings, and stage links.", reading: "May contain spoilers. This page can include history outside the bounded matchboard API; it does not guarantee a complete archive." },
  { path: "/bracket/{id}", title: "League of Legends bracket", description: "Published or explicitly labelled fallback tournament playoff path.", reading: "Uses a tournament id, not a match id. Can reveal outcomes. Do not interpret placeholder teams or synthetic fallback matches as confirmed fixtures." },
  { path: "/valorant/bracket/{id}", title: "Valorant bracket", description: "Published tournament playoff path.", reading: "Uses a tournament id, not a match id. Can reveal outcomes. Missing bracket data does not imply a cancelled tournament." },
] as const;

export function pageMetadata(path: typeof publicPages[number]["path"]): Metadata {
  const page = publicPages.find(page => page.path === path)!;
  return {
    title: page.title, description: page.description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "HomeSports", title: page.title, description: page.description, url: path, images: ["/homesports-logo.png"] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: ["/homesports-logo.png"] },
  };
}

export function siteCatalog(origin = siteOrigin()) {
  return {
    schemaVersion: "1.0", name: "HomeSports", url: origin, language: "en",
    access: { authentication: "none", readOnly: true, mcpAvailable: false },
    coverage: "All public content page route families are described. Dynamic URLs in the sitemap are discovered only from the current non-demo matchboard feeds, not a complete archive. Descriptions are navigation guidance, not full copies of each page.",
    resources: { guide: `${origin}/agents/index.md`, fullGuide: `${origin}/llms-full.txt`, discovery: `${origin}/llms.txt`, openapi: `${origin}/api/agent/openapi`, sitemap: `${origin}/sitemap.xml`, matches: `${origin}/api/agent/matches` },
    pages: publicPages.map(page => ({ ...page, url: `${origin}${page.path}`, format: "text/html" })),
    routeFamilies: publicRouteFamilies.map(page => ({ ...page, urlTemplate: `${origin}${page.path}`, format: "text/html" })),
    exclusions: ["/login is an informational no-account-needed page and is not indexed.", "Browser-local puzzle progress, spoiler settings, and old follows are not exposed.", "Internal /api/matches and /api/worlds are UI endpoints, not supported agent contracts. Use /api/agent/matches; read detail pages as HTML.", "Existing /api/calendar/team/{id} subscriptions contain public schedule data, not personal calendars.", "No dedicated JSON APIs for rosters, standings, brackets, puzzles, or Twitch controls are provided.", "An accessible page or API is not a grant of provider redistribution or model-training rights."],
  };
}

const positiveId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;

// Never invent ids or crawl provider history to build discovery files.
export function discoverPagePaths(feeds: MatchFeed[]): string[] {
  const paths = new Set<string>(publicPages.map(page => page.path));
  for (const feed of feeds) {
    if (feed.demo) continue;
    const prefix = feed.game === "valorant" ? "/valorant" : "";
    for (const match of feed.matches) {
      if (positiveId(match.id)) paths.add(`/match/${match.id}?game=${feed.game}`);
      const tournamentId = publicTournamentId(match);
      if (tournamentId !== null) {
        paths.add(`${prefix}/competition/${tournamentId}`);
        if (match.hasBracket) paths.add(`${prefix}/bracket/${tournamentId}`);
      }
      if (positiveId(match.serieId)) paths.add(`${prefix}/competition/series/${match.serieId}`);
      for (const team of match.opponents) if (positiveId(team.id)) paths.add(`${prefix}/teams/${team.id}`);
    }
  }
  return [...paths];
}

export function websiteStructuredData(origin = siteOrigin()) {
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": `${origin}/#website`, url: `${origin}/`, name: "HomeSports", inLanguage: "en", description: "League of Legends and Valorant esports matchboards, team and competition pages, daily champion games, and read-only agent access.", hasPart: publicPages.map(page => ({ "@type": "WebPage", "@id": `${origin}${page.path}`, url: `${origin}${page.path}`, name: page.title, description: page.description })) };
}

// Escape '<' before putting JSON in a script element, including configured origins.
export function serializeJsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
