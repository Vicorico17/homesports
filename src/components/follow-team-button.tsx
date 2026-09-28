"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { type Game, followedTeamKey } from "@/lib/game";

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

export function FollowTeamButton({ teamId, teamName, game = "lol" }: { teamId: string; teamName: string; game?: Game }) {
  const key = followedTeamKey(game, teamId);
  const [followed, setFollowed] = useState(false);
  useEffect(() => {
    const sync = () => setFollowed(readFollowedTeams().includes(key));
    sync();
    window.addEventListener(FOLLOWED_TEAMS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(FOLLOWED_TEAMS_EVENT, sync); window.removeEventListener("storage", sync); };
  }, [key]);

  function toggleFollow() {
    const current = new Set(readFollowedTeams());
    if (current.has(key)) current.delete(key); else current.add(key);
    window.localStorage.setItem(FOLLOWED_TEAMS_KEY, JSON.stringify([...current]));
    setFollowed(current.has(key));
    track(current.has(key) ? "Team Followed" : "Team Unfollowed", { teamId, teamName, game });
    window.dispatchEvent(new CustomEvent(FOLLOWED_TEAMS_EVENT));
  }

  return <button className={`follow-team-button${followed ? " followed" : ""}`} type="button" onClick={toggleFollow} aria-pressed={followed}>{followed ? "Following" : `Follow ${teamName}`}</button>;
}

export function TeamCalendarLink({ teamId, game = "lol" }: { teamId: string; game?: Game }) {
  const feedPath = `/api/calendar/team/${teamId}${game === "valorant" ? "?game=valorant" : ""}`;
  function subscribe() {
    track("Team Calendar Subscribed", { teamId, game });
    window.location.href = `webcal://${window.location.host}${feedPath}`;
  }
  return <><button className="team-calendar-link" type="button" onClick={subscribe}>Subscribe to calendar</button><a className="team-calendar-link" href={feedPath} onClick={() => track("Team Calendar Downloaded", { teamId, game })}>Download .ics</a></>;
}

export function AuthCalendarControl({ teamId, game = "lol" }: { teamId: string; game?: Game }) {
  return <TeamCalendarLink teamId={teamId} game={game} />;
}
