"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main style={{ maxWidth: 720, margin: "80px auto", padding: 24 }}><h1>HomeSports is temporarily unavailable.</h1><p>Please retry the page.</p><button type="button" onClick={reset}>Try again</button></main></body></html>;
}
