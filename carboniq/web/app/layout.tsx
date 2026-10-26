import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CarbonIQ BD",
  description: "বিলের ছবি থেকে buyer-ready কার্বন report",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className="min-h-screen">
        <header className="border-b bg-white print:hidden">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-bold text-emerald-800">CarbonIQ BD</Link>
            <Link href="/upload" className="text-sm">বিল upload</Link>
            <Link href="/dashboard" className="text-sm">Dashboard</Link>
            <Link href="/report" className="text-sm">Report</Link>
            <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">DEMO</span>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
