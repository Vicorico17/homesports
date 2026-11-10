import Link from "next/link";

export const metadata = { title: "No account needed", robots: { index: false } };

export default function LoginPage() {
  return <main className="login-page"><Link href="/">← Back to matches</Link><p className="eyebrow">HOMESPORTS</p><h1>No account needed.</h1><p>Match schedules, scores, team information, and streams are available without signing in.</p></main>;
}
