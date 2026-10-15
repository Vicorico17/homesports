"use client";

import { useState } from "react";
import { WorldsTeam } from "@/components/worlds-team";
import { canonicalRole } from "@/lib/data-quality";
import type { Game } from "@/lib/game";
import type { Match } from "@/lib/matches";
import type { RosterPlayer } from "@/lib/roster";

const roles = {
  top: { label: "Top", icon: "top", order: 0 },
  jungle: { label: "Jungle", icon: "jungle", order: 1 },
  mid: { label: "Mid", icon: "middle", order: 2 },
  adc: { label: "ADC", icon: "bottom", order: 3 },
  support: { label: "Support", icon: "utility", order: 4 },
};
const playerRole = (player: RosterPlayer) => canonicalRole(player.role ?? player.position ?? player.lane ?? player.role_name);
const isSub = (player: RosterPlayer) => player.substitute || player.is_substitute || player.status?.toLowerCase().includes("sub");

function Player({ player, game }: { player: RosterPlayer; game: Game }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const name = player.nickname || player.name || "Player to be announced";
  const role = game === "lol" ? playerRole(player) : undefined;
  return <li className="match-roster-player">
    {player.image_url && failedImage !== player.image_url
      ? <img className="match-roster-portrait" src={player.image_url} alt="" width={48} height={48} onError={() => setFailedImage(player.image_url!)} />
      : <span className="match-roster-portrait match-roster-initial" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>}
    <div><strong>{name}</strong><span className="match-roster-role">{role ? <><img src={`/icons/position-${roles[role].icon}.svg`} width={16} height={16} alt="" />{roles[role].label}</> : game === "lol" ? "Role unavailable" : "Player"}</span></div>
    {isSub(player) && <span className="match-roster-sub">SUB</span>}
  </li>;
}

export function MatchRosters({ teams, rosters, game }: { teams: Match["opponents"]; rosters: RosterPlayer[][]; game: Game }) {
  return <section className="match-rosters" aria-labelledby="match-rosters-title">
    <h2 id="match-rosters-title">Team rosters</h2>
    <p>Current rosters from PandaScore. Match starters and historical lineups may differ.</p>
    <div className="match-rosters-grid">{[0, 1].map(index => {
      const team = teams[index];
      const players = [...(rosters[index] ?? [])].sort((a, b) => {
        const subOrder = Number(Boolean(isSub(a))) - Number(Boolean(isSub(b)));
        const aRole = playerRole(a), bRole = playerRole(b);
        return subOrder || (game === "lol" ? (aRole ? roles[aRole].order : 99) - (bRole ? roles[bRole].order : 99) : 0);
      });
      return <div className="match-roster-team" key={index}>
        <h3><WorldsTeam team={team ?? { name: "Team to be announced" }} game={game} /></h3>
        {players.length ? <ul>{players.map(player => <Player key={player.id} player={player} game={game} />)}</ul> : <p>{team?.id == null ? "Players will appear once the team is confirmed." : "Roster currently unavailable."}</p>}
      </div>;
    })}</div>
  </section>;
}
