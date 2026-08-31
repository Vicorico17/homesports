"use client";

import { useEffect, useState } from "react";

export const FOLLOWED_TEAMS_KEY = "homesports:followed-teams";
export const FOLLOWED_TEAMS_EVENT = "homesports:followed-teams-changed";

export function readFollowedTeams() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const value = JSON.parse(window.localStorage.getItem(FOLLOWED_TEAMS_KEY) ?? "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [] as string[];
  }
}

export function FollowTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [followed, setFollowed] = useState(false);

  useEffect(() => setFollowed(readFollowedTeams().includes(teamId)), [teamId]);

  function toggleFollow() {
    const current = new Set(readFollowedTeams());
    if (current.has(teamId)) current.delete(teamId); else current.add(teamId);
    window.localStorage.setItem(FOLLOWED_TEAMS_KEY, JSON.stringify([...current]));
    setFollowed(current.has(teamId));
    window.dispatchEvent(new CustomEvent(FOLLOWED_TEAMS_EVENT));
  }

  return <button className={`follow-team-button${followed ? " followed" : ""}`} type="button" onClick={toggleFollow} aria-pressed={followed}>{followed ? "Following" : `Follow ${teamName}`}</button>;
}
