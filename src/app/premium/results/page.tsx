import Link from "next/link";
import { getGridSeries } from "@/lib/grid";
import { verifiedGridHistory, verifiedHistoricalSeries } from "@/lib/grid-history";
export const revalidate = 300;
export const metadata = { title: "Enhanced results · Free GRID stats", alternates: { canonical: "/premium/results" } };
export default async function EnhancedResults() {
  const records = await Promise.all(verifiedGridHistory.map(async record => verifiedHistoricalSeries(record.id, await getGridSeries(record.id))));
  return <main className="shell premium-page"><Link href="/results">← All results</Link><p className="eyebrow">ENHANCED STATS · ALWAYS FREE</p><h1>More detail on completed games.</h1><p>Verified historical GRID coverage. These are completed matches, not live games. Open a match to reveal scores, champion picks, clocks and available player statistics. This curated archive is not a complete match history.</p>{records.some(Boolean) ? <div className="cards">{records.map(record => record && <article className="match" key={record.id}><p>{record.title} · {record.date}</p><h2>{record.teams.join(" vs ")}</h2><Link href={`/premium/${record.id}`}>View enhanced stats · reveals results →</Link></article>)}</div> : <p>Historical statistics are temporarily unavailable. Standard results remain available.</p>}<p><Link href="/premium">Live and upcoming GRID coverage →</Link></p></main>;
}
