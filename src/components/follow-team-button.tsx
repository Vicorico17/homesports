"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { getAuthClient } from "@/lib/auth-client";

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
    track(current.has(teamId) ? "Team Followed" : "Team Unfollowed", { teamId, teamName });
    window.dispatchEvent(new CustomEvent(FOLLOWED_TEAMS_EVENT));
  }

  return <button className={`follow-team-button${followed ? " followed" : ""}`} type="button" onClick={toggleFollow} aria-pressed={followed}>{followed ? "Following" : `Follow ${teamName}`}</button>;
}

export function TeamCalendarLink({ teamId }: { teamId: string }) {
  return <a className="team-calendar-link" href={`/api/calendar/team/${teamId}`} onClick={() => track("Team Calendar Added", { teamId })}>Add calendar</a>;
}

export function AuthCalendarControl({ teamId }: { teamId: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const auth = getAuthClient();
  useEffect(() => {
    if (!auth) { setSignedIn(false); return; }
    auth.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data } = auth.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, [auth]);
  if (signedIn === null) return null;
  return signedIn ? <TeamCalendarLink teamId={teamId} /> : <a className="team-calendar-link" href="/login">Sign in</a>;
}
