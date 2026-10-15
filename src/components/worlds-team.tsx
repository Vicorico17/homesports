"use client";

import Link from "next/link";
import { gamePath, type Game } from "@/lib/game";
import { useState } from "react";

export function WorldsTeam({ team, game = "lol" }: { game?: Game; team: { id?: number; name: string; imageUrl?: string | null } }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const initials = team.name.split(/\s+/).map(word => word[0]).join("").slice(0, 2).toUpperCase() || "?";
  return <span className="worlds-team-identity">
    {team.imageUrl && failedImage !== team.imageUrl
      ? <img className="worlds-team-logo" src={team.imageUrl} alt="" width={32} height={32} onError={() => setFailedImage(team.imageUrl!)} />
      : <span className="worlds-team-logo worlds-team-logo-fallback" aria-hidden="true">{initials}</span>}
    {team.id != null ? <Link href={`${gamePath(game)}/teams/${team.id}`}>{team.name}</Link> : <span>{team.name}</span>}
  </span>;
}
