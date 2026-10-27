"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/upload", label: "বিল upload" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/report", label: "Report" },
  { href: "/copilot", label: "Copilot" },
  { href: "/developers", label: "API · MCP" },
];

export default function Nav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on(); window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);
  const dark = path === "/" && !scrolled;

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 print:hidden ${
      dark ? "bg-transparent" : "border-b border-black/5 bg-white/80 shadow-sm backdrop-blur-xl"}`}>
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--lime)] text-sm font-bold text-[var(--ink)]">C</span>
          <span className={`font-bold tracking-tight ${dark ? "text-white" : "text-[var(--ink)]"}`}>CarbonIQ <span className="text-[var(--leaf)]">BD</span></span>
        </Link>
        <div className="hidden gap-1 sm:flex">
          {LINKS.map((l) => {
            const active = path === l.href;
            return (
              <Link key={l.href} href={l.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  active ? (dark ? "bg-white/15 text-white" : "bg-[var(--forest)] text-white")
                  : dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-gray-600 hover:bg-black/5 hover:text-[var(--ink)]"}`}>
                {l.label}
              </Link>
            );
          })}
        </div>
        <span className="ml-auto rounded-full border border-amber-300/60 bg-amber-100/80 px-2.5 py-0.5 text-xs font-medium text-amber-800">DEMO</span>
        <Link href="/upload" className="hidden rounded-full bg-[var(--lime)] px-4 py-1.5 text-sm font-semibold text-[var(--ink)] transition hover:scale-105 hover:shadow-lg sm:block">
          শুরু করুন →
        </Link>
      </nav>
      <div className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
            path === l.href ? "bg-[var(--forest)] text-white" : dark ? "text-white/80" : "text-gray-600"}`}>{l.label}</Link>
        ))}
      </div>
    </header>
  );
}
