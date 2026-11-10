import "./globals.css";
import "./pickem.css";
import "./league-filter.css";
import "./countdown.css";
import "./bracket.css";
import "./importance-frames.css";
import "./calendar.css";
import "./live-streams.css";
import "./brand-logo.css";
import "./competition.css";
import "./legal.css";
import "./preselect-twitch-extension.css";
import "./login/login.css";
import "./worlds.css";
import "./play.css";
import "./match-preview.css";
import "./match-information.css";
import type { Metadata, Viewport } from "next";
import { siteOrigin } from "@/lib/agent-access";
import { serializeJsonLd, websiteStructuredData } from "@/lib/site-discovery";
import { Analytics } from "@vercel/analytics/next";

// Keep provider reads in one region; cached pages are still served globally.
export const preferredRegion = "iad1";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: "HomeSports — LoL and Valorant", template: "%s — HomeSports" },
  description: "League of Legends and Valorant matchboards that put the big series first.",
  applicationName: "HomeSports",
  openGraph: { type: "website", siteName: "HomeSports", title: "HomeSports — LoL and Valorant", description: "League of Legends and Valorant matchboards that put the big series first.", images: ["/homesports-logo.png"] },
  twitter: { card: "summary_large_image", title: "HomeSports — LoL and Valorant", description: "League of Legends and Valorant matchboards that put the big series first.", images: ["/homesports-logo.png"] },
  icons: { icon: "/homesports-logo-crop.png", apple: "/homesports-logo-crop.png" },
};

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#101110" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="alternate" type="text/plain" href="/llms.txt" title="AI agent discovery" /><link rel="describedby" type="text/markdown" href="/agents/index.md" /><link rel="service-desc" type="application/json" href="/api/agent/openapi" /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteStructuredData()) }} /></head><body>{children}<Analytics /><footer className="legal-footer">HomeSports is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc. <span><a href="/privacy">Privacy</a><a href="/agents">For agents</a><a href="https://github.com/Vicorico17/homesports/issues">Support</a></span></footer></body></html>;
}
