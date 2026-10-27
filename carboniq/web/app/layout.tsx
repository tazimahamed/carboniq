import "./globals.css";
import type { Metadata } from "next";
import { Hind_Siliguri, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Frame from "@/components/Frame";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const bangla = Hind_Siliguri({ subsets: ["bengali"], weight: ["400", "500", "600", "700"], variable: "--font-bangla", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "CarbonIQ BD — প্রমাণসহ কার্বন হিসাব",
  description: "বাংলাদেশের garment factory-র বিল থেকে প্রমাণসহ scope ১ ও ২ নির্গমন হিসাব, buyer ও auditor-এর জন্য",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${sans.variable} ${bangla.variable} ${mono.variable}`}>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-sans), var(--font-bangla), system-ui, sans-serif" }}>
        <Frame>{children}</Frame>
      </body>
    </html>
  );
}
