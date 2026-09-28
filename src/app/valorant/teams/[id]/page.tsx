import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthCalendarControl, FollowTeamButton } from "@/components/follow-team-button";
import { getMatches, normalizeMatch, type Match, type PandaMatch } from "@/lib/matches";
import { panda } from "@/lib/pandascore";

type Player = { id: number; name?: string; nickname?: string; image_url?: string | null };
type Team = { id: number; name?: string; image_url?: string | null; videogame?: { slug?: string }; players?: Player[] };

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Valorant team", robots: { index: false } };
  const team = await panda<Team>(`teams/${id}`, 300);
  const name = team?.videogame?.slug === "valorant" ? team.name : undefined;
  return { title: name ? `${name} Valorant` : "Valorant team", description: name ? `${name} Valorant roster, schedule, results, and calendar.` : "Valorant team schedule and results on HomeSports.", alternates: { canonical: `/valorant/teams/${id}` } };
}

export default async function ValorantTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [teamData, history, feed] = await Promise.all([
    panda<Team>(`teams/${id}`, 300),
    panda<PandaMatch[]>(`teams/${id}/matches?sort=-begin_at&per_page=100`, 60),
    getMatches("valorant"),
  ]);
  const team = teamData?.videogame?.slug === "valorant" || !teamData?.videogame?.slug ? teamData : null;
  const feedMatches = feed.matches.filter(match => match.opponents.some(opponent => String(opponent.id) === id));
  const profile = feedMatches.flatMap(match => match.opponents).find(opponent => String(opponent.id) === id);
  if (!team && !profile) notFound();
  const name = team?.name ?? profile?.name ?? `Team ${id}`;
  const image = team?.image_url ?? profile?.imageUrl;
  const matches = [...new Map([
    ...(history ?? []).filter(match => match.videogame?.slug === "valorant" || !match.videogame?.slug).map(match => normalizeMatch(match, match.status === "running" ? "running" : match.status === "finished" ? "finished" : "upcoming", "valorant")),
    ...feedMatches,
  ].map(match => [match.id, match])).values()] as Match[];
  const upcoming = matches.filter(match => match.status !== "finished").sort((a, b) => (Date.parse(a.beginAt) || Infinity) - (Date.parse(b.beginAt) || Infinity));
  const recent = matches.filter(match => match.status === "finished").sort((a, b) => (Date.parse(b.beginAt) || 0) - (Date.parse(a.beginAt) || 0)).slice(0, 20);
  const players = team?.players ?? [];
  return <main className="competition-page"><Link href="/valorant">← Valorant matches</Link><div className="team-heading">{image ? <img src={image} alt="" /> : <i>{name.slice(0, 1)}</i>}<h1>{name}</h1><div className="team-actions"><FollowTeamButton teamId={id} teamName={name} game="valorant" /><AuthCalendarControl teamId={id} game="valorant" /></div></div><p className="page-intro">Valorant roster and published series data. Calendar subscriptions can include a one-hour reminder in supported apps.</p><section className="competition-section"><h2>Roster</h2>{players.length ? <div className="roster">{players.map(player => <div className="roster-player" key={player.id}>{player.image_url ? <img src={player.image_url} alt="" /> : <i>{(player.nickname ?? player.name ?? "?").slice(0, 1)}</i>}<span><b>{player.nickname ?? player.name ?? "Unknown player"}</b></span></div>)}</div> : <p className="empty">Roster data is not available from the provider.</p>}</section><section className="competition-section"><h2>Upcoming matches</h2><div className="valorant-history">{upcoming.length ? upcoming.map(match => <ValorantMatchRow key={match.id} match={match} />) : <p className="empty">No upcoming matches are published for this team.</p>}</div></section><section className="competition-section"><h2>Recent results</h2><div className="valorant-history">{recent.length ? recent.map(match => <ValorantMatchRow key={match.id} match={match} />) : <p className="empty">No recent results are available.</p>}</div></section></main>;
}

function ValorantMatchRow({ match }: { match: Match }) {
  const date = match.beginAt && Number.isFinite(Date.parse(match.beginAt)) ? new Date(match.beginAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "Date TBD";
  return <article className="valorant-history-row"><span><b>{date}</b><Link href={`/valorant/competition/${match.tournamentId}`}>{match.tournament || match.league}</Link></span><strong>{match.opponents.length ? match.opponents.map(team => team.name).join(" vs ") : match.name}</strong><span>{match.status === "running" ? "LIVE" : match.status === "finished" ? match.opponents.map(team => team.score ?? "—").join(" – ") : "Upcoming"}</span></article>;
}
