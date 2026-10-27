"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const I = {
  dash: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  upload: "M12 3l5 5h-3v6h-4V8H7l5-5zM5 17h14v4H5v-4z",
  report: "M6 2h9l5 5v15H6V2zm8 1.5V8h4.5M9 12h8M9 16h8M9 20h5",
  chat: "M4 4h16v12H8l-4 4V4z",
  api: "M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16",
  eval: "M4 12l5 5L20 6",
};
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const NAV = [
  { href: "/dashboard", label: "ড্যাশবোর্ড", icon: I.dash },
  { href: "/upload", label: "বিল upload", icon: I.upload },
  { href: "/report", label: "Report", icon: I.report },
  { href: "/copilot", label: "Copilot", icon: I.chat },
];
const NAV2 = [
  { href: "/developers", label: "API ও MCP", icon: I.api },
  { href: "/evaluation", label: "মাপা ফলাফল", icon: I.eval },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="7" fill={light ? "#fff" : "var(--ink)"} />
        {/* তিনটা জোড়া লাগানো ledger block */}
        <rect x="7" y="7" width="7" height="7" rx="1.5" fill={light ? "var(--ink)" : "#fff"} />
        <rect x="12.5" y="12.5" width="7" height="7" rx="1.5" fill="var(--lime)" />
        <rect x="18" y="18" width="7" height="7" rx="1.5" fill={light ? "var(--ink)" : "#fff"} />
      </svg>
      <span className={`text-[15px] font-semibold tracking-tight ${light ? "text-white" : "text-[var(--text)]"}`}>CarbonIQ <span className="font-normal opacity-60">BD</span></span>
    </span>
  );
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
        <Link href="/"><Logo /></Link>
        <nav className="hidden gap-6 text-sm text-[var(--muted)] md:flex">
          <a href="#how" className="hover:text-[var(--text)]">কীভাবে কাজ করে</a>
          <a href="#trust" className="hover:text-[var(--text)]">প্রমাণ ও নিরাপত্তা</a>
          <Link href="/developers" className="hover:text-[var(--text)]">Developers</Link>
          <Link href="/evaluation" className="hover:text-[var(--text)]">মাপা ফলাফল</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard" className="hidden rounded-md px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-black/5 sm:block">Demo দেখুন</Link>
          <Link href="/upload" className="rounded-md bg-[var(--forest)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ink)]">বিল upload করুন</Link>
        </div>
      </div>
    </header>
  );
}

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors ${active ? "bg-white/10 font-medium text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`}>
      <Icon d={icon} />{label}
    </Link>
  );
}

function AppFrame({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div className="lg:flex">
      {/* বড় screen: বাম sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[var(--ink)] px-3 py-5 lg:flex print:hidden">
        <Link href="/" className="px-3"><Logo light /></Link>
        <div className="mx-3 mt-6 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
          <p className="text-[13px] font-medium text-white">Demo Knit Factory</p>
          <p className="text-xs text-white/50">গাজীপুর, synthetic ডেটা</p>
        </div>
        <nav className="mt-5 space-y-0.5">{NAV.map((n) => <NavItem key={n.href} {...n} active={path === n.href} />)}</nav>
        <p className="mb-1 mt-6 px-3 text-xs text-white/40">যাচাই ও সংযোগ</p>
        <nav className="space-y-0.5">{NAV2.map((n) => <NavItem key={n.href} {...n} active={path === n.href} />)}</nav>
        <div className="mt-auto px-3 text-xs leading-relaxed text-white/40">
          গুণক: UK DESNZ 2026, Ember<br />পদ্ধতি: GHG Protocol
        </div>
      </aside>

      {/* ছোট screen: উপরে menu */}
      <header className="sticky top-0 z-40 bg-[var(--ink)] lg:hidden print:hidden">
        <div className="flex h-14 items-center px-4"><Link href="/"><Logo light /></Link>
          <span className="ml-auto rounded bg-white/10 px-2 py-0.5 text-xs text-white/80">Demo factory</span></div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {[...NAV, ...NAV2].map((n) => (
            <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] ${path === n.href ? "bg-white/15 text-white" : "text-white/70"}`}>{n.label}</Link>
          ))}
        </nav>
      </header>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function Frame({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path === "/") return <><MarketingHeader />{children}</>;
  return <AppFrame path={path}>{children}</AppFrame>;
}
