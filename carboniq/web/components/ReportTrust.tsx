"use client";
import { useEffect, useMemo, useState } from "react";
import { mrv, type MrvProject } from "@/lib/mrv";
import { monthBn, type InProd, type InRow } from "@/lib/insights";

/** Report-এর "৮. নির্গমন কমানো ও অনিশ্চয়তা" — MRV, Monte Carlo আর audit ঝুঁকি, Dashboard-এর একই হিসাব */
export default function ReportTrust({ rows, production }: { rows: InRow[]; production: InProd[] }) {
  const [mc, setMc] = useState<{ central: number; lo: number; hi: number; relPct: number } | null>(null);
  const [risk, setRisk] = useState<{ score: number; level: string; priority: string } | null>(null);
  const [project, setProject] = useState<MrvProject | null>(null);
  useEffect(() => {
    fetch("/api/risk", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (!j.error) { setMc(j.mc); setRisk(j.summary); } }).catch(() => {});
    fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()).then((j) => setProject(j.projects?.[0] ?? null)).catch(() => {});
  }, []);
  const m = useMemo(() => (project && rows.length && production.length ? mrv(project, rows, production) : null), [project, rows, production]);
  return (
    <section className="rounded-xl border border-[var(--line)] p-5">
      <h3 className="text-[13px] font-bold text-[var(--leaf)]">৮. নির্গমন কমানো ও অনিশ্চয়তা</h3>
      <div className="mt-3 grid gap-3 text-[13px] sm:grid-cols-3">
        <div className="rounded-lg bg-[var(--paper)] p-3">
          <p className="text-[11px] text-[var(--muted)]">মোট নির্গমনের ৯৫% সীমা (Monte Carlo)</p>
          <p className="mt-1 font-bold">{mc ? `${mc.lo.toFixed(0)} – ${mc.hi.toFixed(0)} t (±${mc.relPct.toFixed(1)}%)` : "—"}</p>
        </div>
        <div className="rounded-lg bg-[var(--paper)] p-3">
          <p className="text-[11px] text-[var(--muted)]">{m ? `${m.project.name} (${monthBn(m.project.start)} থেকে)` : "MRV প্রকল্প"}</p>
          <p className="mt-1 font-bold">{m && m.status !== "insufficient-data" ? `${m.claimedT.toFixed(1)} ± ${m.claimedUT.toFixed(1)} t কম · নিট ${m.netT.toFixed(1)} ± ${m.netUT.toFixed(1)} t` : "—"}</p>
          {m?.leakage.length ? <p className="mt-1 text-[11px] text-amber-800">⚠ {m.leakage[0].text}</p> : null}
        </div>
        <div className="rounded-lg bg-[var(--paper)] p-3">
          <p className="text-[11px] text-[var(--muted)]">Audit ঝুঁকি (অগ্রাধিকার, প্রমাণ নয়)</p>
          <p className="mt-1 font-bold">{risk ? `${risk.score}/১০০ · ${risk.level}` : "—"}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">MRV: IPMVP Option C-র ধারণা, baseline regression, ৯০% prediction interval{m?.preliminary ? "; প্রাথমিক অনুমান (১২ মাসের কম তথ্য)" : ""}। অনিশ্চয়তা: মিটারের নির্ভুলতা শ্রেণী আর IPCC 2006-এর গুণক-পরিসর দিয়ে ২,০০০ বার simulation। এই report স্বাধীনভাবে যাচাইকৃত নয়।</p>
    </section>
  );
}
