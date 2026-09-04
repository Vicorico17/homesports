import Link from "next/link";

export default function NotFound() {
  return <main className="status-page"><p className="eyebrow">404</p><h1>That page is off the schedule.</h1><p>The match, team, or competition may have moved or no longer be available.</p><Link href="/">Return to the match board</Link></main>;
}
