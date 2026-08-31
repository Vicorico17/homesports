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
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = { title: "HomeSports — LoL Esports", description: "The League of Legends matchboard that puts the big series first." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<Analytics /><footer className="legal-footer">HomeSports is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc. <a href="/privacy">Privacy</a></footer></body></html>;
}
