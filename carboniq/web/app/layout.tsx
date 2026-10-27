import "./globals.css";
import type { Metadata } from "next";
import { Hind_Siliguri, Manrope } from "next/font/google";
import Nav from "@/components/Nav";

const latin = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-latin", display: "swap" });
const bangla = Hind_Siliguri({ subsets: ["bengali"], weight: ["400", "500", "600", "700"], variable: "--font-bangla", display: "swap" });

export const metadata: Metadata = {
  title: "CarbonIQ BD — বিল থেকে কার্বন report",
  description: "বাংলাদেশের garment শিল্পের জন্য প্রমাণসহ কার্বন ও energy intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${latin.variable} ${bangla.variable}`}>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-latin), var(--font-bangla), system-ui, sans-serif" }}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
