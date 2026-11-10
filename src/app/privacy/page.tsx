import { pageMetadata } from "@/lib/site-discovery";
import Link from "next/link";


export const metadata = pageMetadata("/privacy");

export default function PrivacyPage() {
  return <main className="competition-page"><Link href="/">← Back to matches</Link><div className="competition-heading"><div><p className="eyebrow">HOMESPORTS</p><h1>Privacy</h1></div></div><section className="privacy-copy"><p>HomeSports uses Vercel Web Analytics to understand aggregate page views and product actions such as opening a stream, viewing a match or competition, or completing a daily game. We do not send email addresses, private messages, or payment details through analytics.</p><p>Daily game progress and the Worlds spoiler preference are stored only in your browser using local storage. They are not associated with an account or sent to our servers. The follow and personal calendar controls have been removed. Previously saved team follows remain in your browser until you clear site data. Existing team calendar feed URLs still contain public schedule data; a calendar app may continue to request a feed you subscribed to earlier.</p><p>Match, team, roster, and competition information is supplied by third-party esports data providers. Opening a stream or another external link takes you to that provider&apos;s service and privacy policy.</p><p>Questions, privacy requests, and data-quality reports can be filed through the <a href="https://github.com/Vicorico17/homesports/issues">HomeSports support tracker</a>. No account is required to use the matchboard.</p></section></main>;
}
