import type { Metadata } from "next";
import Link from "next/link";
import { LiveBadge } from "@/components/live-badge";
import { MatchStreamLinks } from "@/components/match-stream-links";
import { notFound } from "next/navigation";
import { getMatches, normalizeMatch, type Match, type PandaMatch } from "@/lib/matches";
import { panda, pandaResult } from "@/lib/pandascore";

import { currentRoster, isRosterTeam, type RosterTeam } from "@/lib/roster-integrity";

export const revalidate = 300;

// Generate on first visit, then reuse the complete route through ISR.
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) return { title: "Valorant team", robots: { index: false } };
  const team = await panda<RosterTeam>(`teams/${id}`, 300);
  const name = isRosterTeam(team, Number(id), "valorant") ? team.name : undefined;
  return { title: name ? `${name} Valorant` : "Valorant team", description: name ? `${name} Valorant roster, schedule, and results.` : "Valorant team schedule and results on HomeSports.", alternates: { canonical: `/valorant/teams/${id}` } };
}

export default async function ValorantTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) notFound();
  const [teamResponse, history, feed] = await Promise.all([
    pandaResult<RosterTeam>(`teams/${id}`, 300),
    panda<PandaMatch[]>(`teams/${id}/matches?sort=-begin_at&per_page=100`, 60),
    getMatches("valorant"),
  ]);
  const team = teamResponse.data;
  if (team && !isRosterTeam(team, Number(id), "valorant")) notFound();
  const roster = currentRoster(team, Number(id), "valorant", teamResponse.sourceDate);
  const feedMatches = feed.matches.filter(match => match.opponents.some(opponent => String(opponent.id) === id));
  const profile = feedMatches.flatMap(match => match.opponents).find(opponent => String(opponent.id) === id);
  if (!team && !profile) notFound();
  const name = team?.name ?? profile?.name ?? `Team ${id}`;
  const image = team?.image_url ?? profile?.imageUrl;
  const matches = [...new Map([
    ...(Array.isArray(history) ? history : []).filter(match => match.videogame?.slug === "valorant" && match.opponents?.some(entry => entry.opponent?.id === Number(id))).map(match => normalizeMatch(match, match.status === "running" ? "running" : match.status === "finished" ? "finished" : "upcoming", "valorant")),
    ...feedMatches,
  ].map(match => [match.id, match])).values()] as Match[];
  const upcoming = matches.filter(match => match.status !== "finished").sort((a, b) => (Date.parse(a.beginAt) || Infinity) - (Date.parse(b.beginAt) || Infinity));
  const recent = matches.filter(match => match.status === "finished").sort((a, b) => (Date.parse(b.beginAt) || 0) - (Date.parse(a.beginAt) || 0)).slice(0, 20);
  const players = roster.players;
  return <main className="competition-page"><Link href="/valorant">← Valorant matches</Link><div className="team-heading">{image ? <img src={image} alt="" /> : <i>{name.slice(0, 1)}</i>}<h1>{name}</h1></div><p className="page-intro">Valorant roster and published series data.</p><section className="competition-section"><h2>Current roster</h2><p className="roster-warning">Source: PandaScore team membership. This is not a confirmed starting five or a historical match lineup.</p>{roster.status === "under-review" && <p className="roster-warning">This provider roster is under review because it includes non-playing team members. Players are hidden until the list is reconciled. <a href="https://www.vlr.gg/team/11058/g2-esports/" target="_blank" rel="noopener noreferrer">View the independent roster source ↗</a></p>}{roster.omitted > 0 && <p className="roster-warning">Some entries were omitted because their identity, activity or team membership could not be resolved.</p>}{players.length ? <div className="roster">{players.map(player => <div className="roster-player" key={player.id}>{player.image_url ? <img src={player.image_url} alt="" /> : <i>{(player.nickname ?? player.name ?? "?").slice(0, 1)}</i>}<span><b>{player.nickname ?? player.name ?? "Unknown player"}</b></span></div>)}</div> : <p className="empty">Roster data is not available from the provider.</p>}</section><section className="competition-section"><h2>Upcoming matches</h2><div className="valorant-history">{upcoming.length ? upcoming.map(match => <ValorantMatchRow key={match.id} match={match} />) : <p className="empty">No upcoming matches are published for this team.</p>}</div></section><section className="competition-section"><h2>Recent results</h2><div className="valorant-history">{recent.length ? recent.map(match => <ValorantMatchRow key={match.id} match={match} />) : <p className="empty">No recent results are available.</p>}</div></section></main>;
}

function ValorantMatchRow({ match }: { match: Match }) {
  const date = match.beginAt && Number.isFinite(Date.parse(match.beginAt)) ? new Date(match.beginAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "Date TBD";
  return <article className="valorant-history-row"><span><b>{date}</b><Link href={`/valorant/competition/${match.tournamentId}`}>{match.tournament || match.league}</Link></span><strong>{match.opponents.length ? match.opponents.map(team => team.name).join(" vs ") : match.name}</strong><span>{match.status === "running" ? <LiveBadge /> : match.status === "finished" ? match.opponents.map(team => team.score ?? "—").join(" – ") : "Upcoming"}</span><MatchStreamLinks streams={match.streams} status={match.status} matchId={match.id} matchName={match.name} league={match.league} compact /></article>;
}
