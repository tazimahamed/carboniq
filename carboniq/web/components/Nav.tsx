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
  { href: "/evaluation", label: "Evaluation" },
];

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--lime)" />
      <path d="M21.5 11.2a7 7 0 1 0 0 9.6" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="22.5" cy="16" r="2" fill="var(--ink)" />
    </svg>
  );
}

export default function Nav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 print:hidden ${
      scrolled ? "border-b border-white/10 bg-[var(--ink)]/85 shadow-[0_8px_30px_-12px_rgba(0,0,0,.5)] backdrop-blur-xl" : "bg-transparent"}`}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-5 flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[17px] font-extrabold tracking-tight text-white">CarbonIQ<span className="ml-1 font-semibold text-[var(--lime)]">BD</span></span>
        </Link>
        <div className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((l) => {
            const active = path === l.href;
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-3.5 py-2 text-[14px] transition-colors ${active ? "text-white" : "text-white/60 hover:text-white"}`}>
                {l.label}
                {active && <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-[var(--lime)]" />}
              </Link>
            );
          })}
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />DEMO
        </span>
        <Link href="/upload" className="btn-lime ml-auto rounded-full px-4 py-2 text-sm font-bold transition sm:ml-2">শুরু করুন →</Link>
      </nav>
      <div className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
            path === l.href ? "bg-white/15 text-white" : "text-white/70"}`}>{l.label}</Link>
        ))}
      </div>
    </header>
  );
}
