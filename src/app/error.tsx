"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="status-page"><p className="eyebrow">TEMPORARY ERROR</p><h1>We dropped the feed.</h1><p>The data source may be unavailable. Try again while we reconnect.</p><button type="button" onClick={reset}>Try again</button><Link href="/">Return home</Link></main>;
}
