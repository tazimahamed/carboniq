"use client";
import { useMemo } from "react";
import { useRecords } from "@/lib/useRecords";
import ReportTrust from "@/components/ReportTrust";
import { FACTORS } from "@/lib/factors";
import Shell from "@/components/Shell";
import { LogoMark } from "@/components/Nav";

const BN_MONTH = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const mLabel = (m: string) => `${BN_MONTH[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(0, 4)}`;
const FUEL: Record<string, string> = { electricity: "বিদ্যুৎ (grid)", natural_gas: "প্রাকৃতিক গ্যাস", diesel: "ডিজেল", lpg: "LPG" };
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function Report() {
  const { rows, production, valid, error, loading, total } = useRecords();

  const r = useMemo(() => {
    const months = Array.from(new Set(rows.map((x) => x.period_month.slice(0, 7)))).sort();
    const byMonth = months.map((m) => {
      const xs = rows.filter((x) => x.period_month.startsWith(m));
      const s1 = xs.filter((x) => x.scope === 1).reduce((a, x) => a + x.kg_co2e, 0) / 1000;
      const s2 = xs.filter((x) => x.scope === 2).reduce((a, x) => a + x.kg_co2e, 0) / 1000;
      return { m, s1, s2, t: s1 + s2 };
    });
    const fuels = Object.keys(FUEL).map((a) => {
      const xs = rows.filter((x) => x.activity === a);
      return { a, qty: xs.reduce((s, x) => s + x.quantity, 0), unit: xs[0]?.unit, t: xs.reduce((s, x) => s + x.kg_co2e, 0) / 1000, f: xs[0] };
    }).filter((f) => f.f);
    return { months, byMonth, fuels, max: Math.max(1, ...byMonth.map((x) => x.t)) };
  }, [rows]);

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const lastHash = rows.at(-1)?.hash ?? "—";
  const bills = rows.filter((x) => x.has_bill).length;
  const t = total(), s1 = total(1), s2 = total(2);
  const reportId = `CIQ-${(lastHash.slice(0, 8) || "00000000").toUpperCase()}`;

  if (loading) return <Shell eyebrow="Buyer report" title="GHG Inventory Report"><div className="card h-96 animate-pulse" /></Shell>;
  if (error) return <Shell eyebrow="Buyer report" title="GHG Inventory Report"><p className="card p-6 text-red-700">{error}</p></Shell>;

  return (
    <Shell eyebrow="Buyer report · PDF-এর জন্য প্রস্তুত" title="GHG Inventory Report"
      sub="এই পাতাটাই PDF হবে — print window-এ &quot;Save as PDF&quot; বেছে নিন"
      right={<button onClick={() => window.print()} className="btn-lime rounded-full px-5 py-2.5 text-sm font-bold transition">PDF হিসেবে save ↓</button>}>

      <article className="mx-auto max-w-[900px] overflow-hidden rounded-[18px] border border-[var(--line)] bg-white shadow-[0_30px_60px_-30px_rgba(11,31,23,.35)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        {/* letterhead */}
        <header className="relative overflow-hidden bg-[var(--ink)] px-10 py-8 text-white print:px-8">
          <div className="grid-bg absolute inset-0 opacity-50" />
          <div className="relative flex items-start gap-4">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="text-[15px] font-extrabold tracking-tight">CarbonIQ<span className="ml-1 font-semibold text-[var(--lime)]">BD</span></p>
              <p className="text-xs text-white/55">Greenhouse Gas Inventory · Scope 1 &amp; 2</p>
            </div>
            <div className="ml-auto text-right text-xs text-white/60">
              <p>Report ID <span className="font-mono text-white">{reportId}</span></p>
              <p className="mt-0.5">তৈরি {today}</p>
              <p className="mt-2 inline-block rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">DEMO · synthetic data</p>
            </div>
          </div>
          <div className="relative mt-8">
            <h2 className="text-[28px] font-bold leading-tight">Demo Knit Factory</h2>
            <p className="mt-1 text-sm text-white/60">গাজীপুর, বাংলাদেশ · Knit garment · রিপোর্টের সময়কাল {r.months[0] ? mLabel(r.months[0]) : "—"} – {r.months.at(-1) ? mLabel(r.months.at(-1)!) : "—"}</p>
          </div>
        </header>

        <div className="space-y-9 px-10 py-9 print:px-8">
          {/* সারাংশ */}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--leaf)]">১. সারাংশ</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[var(--ink)] p-4 text-white print:border print:border-black/20 print:bg-white print:text-black">
                <p className="text-xs opacity-60">মোট নির্গমন</p>
                <p className="mt-1 text-[26px] font-extrabold tracking-tight">{fmt(t)}<span className="ml-1 text-xs font-semibold text-[var(--lime)] print:text-black">tCO₂e</span></p>
              </div>
              {[["Scope 1 · সরাসরি জ্বালানি", s1], ["Scope 2 · কেনা বিদ্যুৎ (location-based)", s2]].map(([k, v]) => (
                <div key={k as string} className="rounded-xl border border-[var(--line)] p-4">
                  <p className="text-xs text-[var(--muted)]">{k}</p>
                  <p className="mt-1 text-[26px] font-extrabold tracking-tight">{fmt(v as number)}<span className="ml-1 text-xs font-semibold text-[var(--muted)]">tCO₂e</span></p>
                  <p className="text-xs text-[var(--muted)]">মোটের {t ? fmt(((v as number) / t) * 100, 0) : 0}%</p>
                </div>
              ))}
            </div>
          </section>

          {/* মাসভিত্তিক chart */}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--leaf)]">২. মাসভিত্তিক প্রবণতা</h3>
            <div className="mt-4 flex h-36 items-end gap-2 border-b border-[var(--line)] pb-px">
              {r.byMonth.map((x) => (
                <div key={x.m} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[9px] tabular-nums text-[var(--muted)]">{fmt(x.t, 0)}</span>
                  <div className="flex w-full max-w-[30px] flex-col overflow-hidden rounded-t-[3px]" style={{ height: `${(x.t / r.max) * 85}%` }}>
                    <div className="bg-[#7ee0a8]" style={{ height: `${x.t ? (x.s2 / x.t) * 100 : 0}%` }} />
                    <div className="flex-1 bg-[var(--forest)]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">{r.byMonth.map((x) => <span key={x.m} className="flex-1 text-center text-[9px] text-[var(--muted)]">{BN_MONTH[parseInt(x.m.slice(5, 7), 10) - 1].slice(0, 3)}</span>)}</div>
            <div className="mt-3 flex gap-4 text-[11px] text-[var(--muted)]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--forest)]" />Scope 1</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#7ee0a8]" />Scope 2</span>
            </div>
          </section>

          {/* উৎস অনুযায়ী */}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--leaf)]">৩. উৎস অনুযায়ী হিসাব</h3>
            <table className="mt-3 w-full text-sm">
              <thead><tr className="border-b-2 border-[var(--ink)] text-left text-xs text-[var(--muted)]">
                <th className="py-2 font-semibold">উৎস</th><th className="font-semibold">Scope</th><th className="text-right font-semibold">মোট পরিমাণ</th><th className="text-right font-semibold">গুণক</th><th className="text-right font-semibold">tCO₂e</th><th className="text-right font-semibold">অংশ</th>
              </tr></thead>
              <tbody>
                {r.fuels.map((f) => (
                  <tr key={f.a} className="border-b border-[var(--line)]">
                    <td className="py-2.5 font-medium">{FUEL[f.a]}</td>
                    <td>{f.f!.scope}</td>
                    <td className="text-right tabular-nums">{f.qty.toLocaleString()} {f.unit}</td>
                    <td className="text-right tabular-nums text-[var(--muted)]">{f.f!.factor} kg/{f.unit}</td>
                    <td className="text-right font-semibold tabular-nums">{fmt(f.t)}</td>
                    <td className="text-right tabular-nums text-[var(--muted)]">{t ? fmt((f.t / t) * 100, 1) : 0}%</td>
                  </tr>
                ))}
                <tr className="font-bold"><td className="py-2.5">মোট</td><td /><td /><td /><td className="text-right tabular-nums">{fmt(t)}</td><td className="text-right">100%</td></tr>
              </tbody>
            </table>
          </section>

          {/* মাস অনুযায়ী বিস্তারিত */}
          <section className="break-inside-avoid-page">
            <h3 className="text-[13px] font-bold text-[var(--leaf)]">৪. মাস অনুযায়ী বিস্তারিত</h3>
            <table className="mt-3 w-full text-sm">
              <thead><tr className="border-b-2 border-[var(--ink)] text-left text-xs text-[var(--muted)]">
                <th className="py-2 font-semibold">মাস</th><th className="text-right font-semibold">Scope 1 (t)</th><th className="text-right font-semibold">Scope 2 (t)</th><th className="text-right font-semibold">মোট (t)</th>
              </tr></thead>
              <tbody>
                {r.byMonth.map((x, i) => (
                  <tr key={x.m} className={`border-b border-[var(--line)] ${i % 2 ? "bg-paper/60" : ""}`}>
                    <td className="py-2">{mLabel(x.m)}</td>
                    <td className="text-right tabular-nums">{fmt(x.s1)}</td>
                    <td className="text-right tabular-nums">{fmt(x.s2)}</td>
                    <td className="text-right font-semibold tabular-nums">{fmt(x.t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* পদ্ধতি */}
          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-[13px] font-bold text-[var(--leaf)]">৫. পদ্ধতি</h3>
              <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[var(--muted)]">
                <li>GHG Protocol Corporate Standard অনুযায়ী। নির্গমন = কার্যক্রমের পরিমাণ × গুণক।</li>
                <li>হিসাবে কোনো AI ব্যবহার হয়নি; একই input-এ সবসময় একই ফল।</li>
                <li>DESNZ (যুক্তরাজ্য)-এর জ্বালানি গুণক বাংলাদেশে proxy হিসেবে ব্যবহৃত — জ্বালানির রসায়ন একই, তবে বায়োফুয়েল মিশ্রণ আলাদা হতে পারে।</li>
                <li>Scope 2 location-based। Grid গুণক Ember-এর lifecycle intensity — রক্ষণশীল; T&amp;D loss অন্তর্ভুক্ত নয়।</li>
              </ul>
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[var(--leaf)]">৬. গুণকের উৎস</h3>
              <ul className="mt-3 space-y-2 text-[13px] leading-relaxed">
                {r.fuels.map((f) => (
                  <li key={f.a}><span className="font-medium">{FUEL[f.a]}:</span> <span className="text-[var(--muted)]">{f.f!.factor_source} ({f.f!.factor_version}) · {FACTORS.find((x) => x.activity === f.a)?.geography}</span></li>
                ))}
              </ul>
            </div>
          </section>

          {/* প্রমাণ */}
          <section className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-[13px] font-bold text-[var(--leaf)]">৭. প্রমাণ ও অখণ্ডতা</h3>
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${valid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{valid ? "✓ Ledger অক্ষত" : "⚠ Ledger যাচাই ব্যর্থ"}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              {[["মোট record", rows.length], ["মানুষের নিশ্চিত (L1)", rows.length], ["মূল বিল সংযুক্ত (L2)", bills], ["Hash-সিল (L3)", rows.length]].map(([k, v]) => (
                <div key={k as string} className="rounded-lg bg-white p-3"><p className="text-xl font-extrabold">{v}</p><p className="text-[11px] text-[var(--muted)]">{k}</p></div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-[var(--muted)]">শেষ ledger hash (SHA-256) — এই hash দিয়ে পুরো chain যাচাই করা যায়:</p>
            <p className="mt-1 break-all rounded-md bg-white px-3 py-2 font-mono text-[11px]">{lastHash}</p>
          </section>

          <ReportTrust rows={rows} production={production} />
        </div>

        <footer className="border-t border-[var(--line)] px-10 py-5 text-[11px] leading-relaxed text-[var(--muted)] print:px-8">
          Emission factors: UK Government GHG Conversion Factors 2026 (OGL v3.0). Grid carbon intensity: Ember (CC-BY-4.0).
          এটা স্বাধীনভাবে নিরীক্ষিত (L4) report নয়। Demo factory-র সব সংখ্যা synthetic। · Report ID {reportId}
        </footer>
      </article>
    </Shell>
  );
}
