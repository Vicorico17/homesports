import "./globals.css";
import "./pickem.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "HomeSports — LoL Esports", description: "The League of Legends matchboard that puts the big series first." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
