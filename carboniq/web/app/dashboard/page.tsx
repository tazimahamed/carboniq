"use client";
import Link from "next/link";
import { useState } from "react";
import { useRecords } from "@/lib/useRecords";
import { ACTIVITY_LABEL } from "@/lib/factors";
import Shell from "@/components/Shell";
import { CountUp, TiltCard } from "@/components/fx";

const BN_MONTH = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
const monthLabel = (m: string) => `${BN_MONTH[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(2, 4)}`;

export default function Dashboard() {
  const { rows, valid, error, loading, total, reload } = useRecords();
  const [seeding, setSeeding] = useState("");
  const [hover, setHover] = useState<string | null>(null);

  async function seed() {
    setSeeding("Demo data বানানো হচ্ছে...");
    try {
      const j = await fetch("/api/demo/seed", { method: "POST" }).then((r) => r.json());
      setSeeding(j.error ? j.error : `${j.months} মাসের demo data যোগ হয়েছে (${j.records}টা record)`);
    } catch {
      setSeeding("Server সময়মতো উত্তর দেয়নি — page refresh করে আবার চেষ্টা করুন");
    }
    reload();
  }

  const months = Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort();
  const byMonth = months.map((m) => {
    const rs = rows.filter((r) => r.period_month.startsWith(m));
    const s1 = rs.filter((r) => r.scope === 1).reduce((a, r) => a + r.kg_co2e, 0) / 1000;
    const s2 = rs.filter((r) => r.scope === 2).reduce((a, r) => a + r.kg_co2e, 0) / 1000;
    return { m, s1, s2, t: s1 + s2 };
  });
  const max = Math.max(1, ...byMonth.map((x) => x.t));
  const peak = byMonth.reduce((a, b) => (b.t > a.t ? b : a), byMonth[0] ?? { m: "", t: 0, s1: 0, s2: 0 });
  const t = total(), s1 = total(1), s2 = total(2);

  const stats = [
    { k: "মোট নির্গমন", v: t, sub: `${months.length} মাস`, accent: true },
    { k: "Scope 1 · জ্বালানি", v: s1, sub: t ? `${((s1 / t) * 100).toFixed(0)}% মোটের` : "—" },
    { k: "Scope 2 · বিদ্যুৎ", v: s2, sub: t ? `${((s2 / t) * 100).toFixed(0)}% মোটের` : "—" },
    { k: "সর্বোচ্চ মাস", v: peak?.t ?? 0, sub: peak?.m ? monthLabel(peak.m) : "—" },
  ];

  return (
    <Shell eyebrow="Demo Knit Factory · গাজীপুর" title="Dashboard" sub="নিশ্চিত ও hash-সিল করা record থেকে"
      right={<Link href="/report" className="rounded-full bg-[var(--forest)] px-5 py-2.5 text-sm font-medium text-white transition hover:scale-105 hover:shadow-lg">Report (PDF) →</Link>}>
      {error && <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <TiltCard key={s.k} className={`rounded-2xl border p-5 shadow-sm ${s.accent ? "border-transparent bg-[var(--ink)] text-white" : "border-black/5 bg-white"}`}>
            <p className={`text-sm ${s.accent ? "text-white/60" : "text-gray-500"}`}>{s.k}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {loading ? "—" : <CountUp to={s.v} decimals={1} />}<span className={`ml-1 text-sm font-medium ${s.accent ? "text-[var(--lime)]" : "text-gray-400"}`}>tCO₂e</span>
            </p>
            <p className={`mt-1 text-xs ${s.accent ? "text-white/50" : "text-gray-400"}`}>{s.sub}</p>
          </TiltCard>
        ))}
      </div>

      <div className={`mt-4 flex items-center gap-3 rounded-2xl border p-4 text-sm ${
        valid === false ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-base shadow-sm">{valid === false ? "⚠" : "⛓"}</span>
        <span>
          {loading ? "Ledger যাচাই হচ্ছে..." : valid === null ? "Ledger যাচাই করা যায়নি"
            : valid ? <><b>Ledger অক্ষত</b> — {rows.length}টা record SHA-256 chain-এ সিল, কোনোটা বদলানো হয়নি</> : "Ledger-এ গরমিল পাওয়া গেছে"}
        </span>
      </div>

      {!loading && rows.length === 0 && !error && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-black/10 bg-white p-10 text-center">
          <p className="text-lg font-semibold">এখনো কোনো ডেটা নেই</p>
          <p className="mt-1 text-sm text-gray-500">বিল upload করুন, অথবা ১২ মাসের synthetic demo data দিয়ে শুরু করুন</p>
          <div className="mt-5 flex justify-center gap-3">
            <button onClick={seed} className="rounded-full bg-[var(--lime)] px-5 py-2.5 font-semibold text-[var(--ink)] transition hover:scale-105">Demo data যোগ করুন</button>
            <Link href="/upload" className="rounded-full border px-5 py-2.5 transition hover:bg-black/5">বিল upload</Link>
          </div>
        </div>
      )}
      {seeding && <p className="mt-3 text-sm text-gray-600">{seeding}</p>}

      {byMonth.length > 0 && (
        <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="font-semibold">মাসভিত্তিক নির্গমন</h2>
            <div className="ml-auto flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--forest)]" /> Scope 1</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#7cc49a]" /> Scope 2</span>
            </div>
          </div>
          <div className="mt-6 flex h-56 items-end gap-2">
            {byMonth.map((x) => {
              const on = hover === x.m;
              return (
                <div key={x.m} className="relative flex h-full flex-1 flex-col justify-end"
                  onMouseEnter={() => setHover(x.m)} onMouseLeave={() => setHover(null)}>
                  {on && (
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 w-36 -translate-x-1/2 rounded-lg bg-[var(--ink)] p-2.5 text-xs text-white shadow-xl">
                      <p className="font-semibold">{monthLabel(x.m)}</p>
                      <p className="mt-1 text-white/70">Scope 1: {x.s1.toFixed(1)} t</p>
                      <p className="text-white/70">Scope 2: {x.s2.toFixed(1)} t</p>
                      <p className="mt-1 font-semibold text-[var(--lime)]">মোট: {x.t.toFixed(1)} t</p>
                    </div>
                  )}
                  <div className={`flex w-full flex-col overflow-hidden rounded-t-md transition-all duration-300 ${on ? "opacity-100" : hover ? "opacity-40" : "opacity-100"}`}
                    style={{ height: `${(x.t / max) * 100}%` }}>
                    <div className="bg-[#7cc49a]" style={{ height: `${x.t ? (x.s2 / x.t) * 100 : 0}%` }} />
                    <div className="flex-1 bg-[var(--forest)]" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            {byMonth.map((x) => <span key={x.m} className="flex-1 text-center text-[10px] text-gray-500">{monthLabel(x.m)}</span>)}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="flex items-center border-b px-5 py-4">
            <h2 className="font-semibold">সব record</h2>
            <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{rows.length}টা</span>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr><th className="px-5 py-3">মাস</th><th>ধরন</th><th>পরিমাণ</th><th>Scope</th><th className="pr-5 text-right">kg CO₂e</th><th>প্রমাণ</th><th className="pr-5">Hash</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 transition hover:bg-emerald-50/50">
                    <td className="px-5 py-3">{monthLabel(r.period_month.slice(0, 7))}</td>
                    <td>{ACTIVITY_LABEL[r.activity] ?? r.activity}</td>
                    <td className="tabular-nums">{r.quantity.toLocaleString()} {r.unit}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs ${r.scope === 1 ? "bg-[var(--forest)] text-white" : "bg-[#d6efe0] text-[var(--forest)]"}`}>S{r.scope}</span></td>
                    <td className="pr-5 text-right tabular-nums">{r.kg_co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                    <td>{r.has_bill
                      ? <a href={`/api/bill?record=${r.record_id}`} target="_blank" className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 hover:bg-emerald-200">বিল দেখুন{r.meter_ok ? " ✓" : ""}</a>
                      : <span className="text-xs text-gray-400">{r.evidence_level === "L1+L3" ? "synthetic" : "—"}</span>}</td>
                    <td className="pr-5 font-mono text-xs text-gray-400" title={r.hash}>{r.hash.slice(0, 10)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
