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
import "./login/login.css";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://homesports.vercel.app"),
  title: { default: "HomeSports — LoL Esports", template: "%s — HomeSports" },
  description: "The League of Legends matchboard that puts the big series first.",
  applicationName: "HomeSports",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "HomeSports", title: "HomeSports — LoL Esports", description: "The League of Legends matchboard that puts the big series first.", images: ["/homesports-logo.png"] },
  twitter: { card: "summary_large_image", title: "HomeSports — LoL Esports", description: "The League of Legends matchboard that puts the big series first.", images: ["/homesports-logo.png"] },
  icons: { icon: "/homesports-logo-crop.png", apple: "/homesports-logo-crop.png" },
};

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#101110" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<Analytics /><footer className="legal-footer">HomeSports is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc. <span><a href="/privacy">Privacy</a><a href="https://github.com/Vicorico17/homesports/issues">Support</a></span></footer></body></html>;
}
