"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { mrv, type MrvProject } from "@/lib/mrv";
import type { InProd, InRow } from "@/lib/insights";
import { monthBn } from "@/lib/insights";

type Risk = { month: string; activity: string; score: number; level: string; flags: { key: string; text: string }[] };
type RiskResp = { risks: Risk[]; summary: { score: number; level: string; priority: string; reasons: { key: string; sharePct: number }[] }; mc: { central: number; lo: number; hi: number; relPct: number; n: number; mix: { meterVerified: number; billOnly: number; manual: number } } };
const REASON: Record<string, string> = { noBill: "মূল বিল নেই", meterMismatch: "মিটার মেলেনি", billMismatch: "বিলে গরমিল", edited: "OCR হাতে বদলানো", lowOcr: "OCR কম নিশ্চিত", round: "গোল সংখ্যা", future: "ভবিষ্যতের মাস", anomaly: "অস্বাভাবিক ব্যবহার" };
const ACT: Record<string, string> = { electricity: "বিদ্যুৎ", natural_gas: "গ্যাস", diesel: "ডিজেল", lpg: "LPG" };

/** Dashboard: অনিশ্চয়তা, audit ঝুঁকি আর MRV — "কতটা বিশ্বাস করা যায়" এক সারিতে */
export default function TrustRow({ rows, production }: { rows: InRow[]; production: InProd[] }) {
  const [risk, setRisk] = useState<RiskResp | null>(null);
  const [project, setProject] = useState<MrvProject | null>(null);
  useEffect(() => {
    fetch("/api/risk", { cache: "no-store" }).then((r) => r.json()).then((j) => !j.error && setRisk(j)).catch(() => {});
    fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()).then((j) => setProject(j.projects?.[0] ?? null)).catch(() => {});
  }, [rows.length]);
  const m = useMemo(() => (project && rows.length && production.length ? mrv(project, rows, production) : null), [project, rows, production]);
  const mc = risk?.mc, total = mc ? mc.mix.meterVerified + mc.mix.billOnly + mc.mix.manual || 1 : 1;
  const span = mc ? mc.hi - mc.lo : 1;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      {/* Monte Carlo */}
      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">অনিশ্চয়তা · Monte Carlo</p>
        {mc ? (
          <>
            <p className="mt-2 text-3xl font-extrabold tabular-nums">{mc.central.toLocaleString("en-US", { maximumFractionDigits: 0 })} <span className="text-base font-semibold text-[var(--muted)]">± {mc.relPct.toFixed(1)}%</span></p>
            <p className="text-xs text-[var(--muted)]">৯৫% সম্ভাব্য সীমা {mc.lo.toFixed(0)} – {mc.hi.toFixed(0)} tCO₂e · {mc.n.toLocaleString()} বার simulation</p>
            <div className="relative mt-4 h-8 rounded-full bg-[var(--paper)]">
              <div className="absolute inset-y-1.5 rounded-full bg-gradient-to-r from-leaf/20 via-leaf/60 to-leaf/20" style={{ left: "8%", right: "8%" }} />
              <div className="absolute inset-y-0 w-0.5 bg-[var(--ink)]" style={{ left: `${8 + ((mc.central - mc.lo) / span) * 84}%` }} />
            </div>
            <p className="mt-4 text-xs font-semibold">তথ্যের মান অনুযায়ী ভাগ</p>
            <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full">
              <i className="bg-[var(--leaf)]" style={{ width: `${(mc.mix.meterVerified / total) * 100}%` }} title="বিল + মিটার মিলেছে" />
              <i className="bg-sky-400" style={{ width: `${(mc.mix.billOnly / total) * 100}%` }} title="শুধু বিল" />
              <i className="bg-amber-300" style={{ width: `${(mc.mix.manual / total) * 100}%` }} title="বিল ছাড়া" />
            </div>
            <p className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-[var(--muted)]"><span>■ <b className="text-[var(--leaf)]">মিটার মিলেছে ±১%</b></span><span className="text-sky-600">■ শুধু বিল ±২%</span><span className="text-amber-600">■ বিল ছাড়া ±৫%</span></p>
            <p className="mt-2 text-[10px] text-[var(--muted)]">গুণক: IPCC 2006 পরিসর ও grid-এর বার্ষিক ওঠানামা — বিল যোগ করলে সীমা ছোট হয়</p>
          </>
        ) : <div className="mt-3 h-32 animate-pulse rounded-xl bg-[var(--paper)]" />}
      </div>

      {/* ঝুঁকি */}
      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Audit ঝুঁকি</p>
        {risk ? (
          <>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-3xl font-extrabold tabular-nums">{risk.summary.score}<span className="text-base text-[var(--muted)]">/১০০</span></p>
              <span className={`mb-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${risk.summary.level === "বেশি" ? "bg-red-100 text-red-800" : risk.summary.level === "মাঝারি" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{risk.summary.level}</span>
            </div>
            <p className="text-xs text-[var(--muted)]">Audit অগ্রাধিকার: {risk.summary.priority}</p>
            <ul className="mt-3 space-y-1.5">
              {risk.summary.reasons.slice(0, 3).map((r) => (
                <li key={r.key} className="text-xs"><div className="flex justify-between"><span>{REASON[r.key] ?? r.key}</span><span className="tabular-nums text-[var(--muted)]">নির্গমনের {r.sharePct}%</span></div><div className="mt-0.5 h-1.5 rounded-full bg-[var(--paper)]"><div className="h-full rounded-full bg-amber-400" style={{ width: `${r.sharePct}%` }} /></div></li>
              ))}
            </ul>
            {risk.risks.filter((x) => x.level === "বেশি").slice(0, 2).map((x) => <p key={x.month + x.activity} className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">{monthBn(x.month)} · {ACT[x.activity]}: {x.flags.map((f) => REASON[f.key]).join(", ")}</p>)}
            <p className="mt-2 text-[10px] text-[var(--muted)]">প্রতিটা নিয়ম ব্যাখ্যাযোগ্য — প্রতারণার প্রমাণ নয়, কোনটা আগে যাচাই করা উচিত তার নির্দেশ</p>
          </>
        ) : <div className="mt-3 h-32 animate-pulse rounded-xl bg-[var(--paper)]" />}
      </div>

      {/* MRV */}
      <Link href="/mrv" className="card card-hover group relative overflow-hidden p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">কমানো যাচাই · MRV</p>
        {m && m.status !== "insufficient-data" ? (
          <>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-[var(--leaf)]">{m.claimedT.toFixed(1)} <span className="text-base font-semibold text-[var(--muted)]">± {m.claimedUT.toFixed(1)} t</span></p>
            <p className="text-xs text-[var(--muted)]">{project?.name} · {monthBn(m.post.from)} থেকে</p>
            <p className="mt-3 text-sm">নিট (সব জ্বালানি): <b>{m.netT.toFixed(1)} ± {m.netUT.toFixed(1)} t</b></p>
            {m.leakage.length > 0 && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">⚠ {m.leakage.length}টা leakage ধরা পড়েছে</p>}
            <p className="mt-2 text-xs text-[var(--muted)]">প্রতি পিসে {m.intensity.changePct > 0 ? "+" : ""}{m.intensity.changePct.toFixed(1)}%{m.preliminary ? " · প্রাথমিক" : ""}</p>
          </>
        ) : <p className="mt-3 text-sm text-[var(--muted)]">{m ? m.verdict : "লোড হচ্ছে…"}</p>}
        <p className="mt-4 text-sm font-semibold text-[var(--leaf)] transition group-hover:translate-x-0.5">পুরো যাচাই দেখুন →</p>
      </Link>
    </div>
  );
}
