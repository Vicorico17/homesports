import Link from "next/link";
import { LiveBadge } from "@/components/live-badge";
import { MatchPreviewLink } from "@/components/match-preview-link";
import { MatchStreamLinks } from "@/components/match-stream-links";
import { hasWonSeries } from "@/lib/competition-schedule";
import type { Match } from "@/lib/matches";
import { gamePath, type Game } from "@/lib/game";

export function CompetitionMatchList({ matches, game = "lol" }: { matches: Match[]; game?: Game }) {
  const prefix = gamePath(game);
  return <div className="competition-match-list">{matches.map(match => {
    const start = Date.parse(match.beginAt);
    const time = Number.isFinite(start)
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(start) + " UTC"
      : "Time to be announced";
    return <article className={`competition-match match-preview-card ${match.status}`} key={match.id}>
      <div className="competition-match-meta">
        {match.status === "running" ? <LiveBadge /> : <span>{match.status === "finished" ? "FINISHED" : "UPCOMING"}</span>}
        <time dateTime={Number.isFinite(start) ? match.beginAt : undefined}>{time}</time>
        <Link href={`${prefix}/competition/${match.tournamentId}`}>{match.tournament || match.league}</Link>
        <span>Best of {match.bestOf}</span>
      </div>
      <div className="competition-match-teams">{[0, 1].map(index => {
        const team = match.opponents[index];
        return <div className={`competition-match-team${hasWonSeries(match, index) ? " winner" : ""}`} key={team?.id ?? index}>
          {team?.imageUrl ? <img src={team.imageUrl} width={28} height={28} alt="" /> : <i aria-hidden="true">{team?.name.slice(0, 1) ?? "?"}</i>}
          {team?.id != null ? <Link href={`${prefix}/teams/${team.id}`}>{team.name}</Link> : <span>{team?.name ?? "To be announced"}</span>}
          {match.status !== "upcoming" && <strong>{team?.score ?? "—"}</strong>}
        </div>;
      })}</div>
      <div className="competition-match-actions">
        <MatchPreviewLink id={match.id} name={match.name} game={game} />
        {match.status !== "finished" && <MatchStreamLinks streams={match.streams} status={match.status} matchId={match.id} matchName={match.name} league={match.league} compact />}
      </div>
    </article>;
  })}</div>;
}
