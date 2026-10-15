import Link from "next/link";
import type { Game } from "@/lib/game";

export function MatchPreviewLink({ id, name, game = "lol" }: { id: number; name: string; game?: Game }) {
  return <Link className="match-preview-link" href={`/match/${id}?game=${game}`} aria-label={`View ${name || "match"}: teams and win chances`}>Teams & win chances ↗</Link>;
}
