import "./globals.css";
import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import Nav from "@/components/Nav";

const font = Hind_Siliguri({ subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "CarbonIQ BD — বিল থেকে কার্বন report",
  description: "বাংলাদেশের garment শিল্পের জন্য প্রমাণসহ কার্বন ও energy intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className={`${font.className} min-h-screen`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
