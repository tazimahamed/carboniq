"use client";
import { useRecords } from "@/lib/useRecords";
import { ACTIVITY_LABEL } from "@/lib/factors";
import Shell from "@/components/Shell";

export default function Report() {
  const { rows, valid, error, loading, total } = useRecords();
  const months = Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort();
  const sources = Array.from(new Map(rows.map((r) => [r.activity, r])).values());
  const lastHash = rows.length ? rows[rows.length - 1].hash : "—";
  const today = new Date().toISOString().slice(0, 10);

  if (loading) return <Shell eyebrow="GHG Inventory" title="Report"><p>Report তৈরি হচ্ছে...</p></Shell>;
  if (error) return <Shell eyebrow="GHG Inventory" title="Report"><p className="text-red-600">{error}</p></Shell>;

  return (
    <Shell eyebrow="GHG Inventory" title="Report" sub={"Print window-এ \"Save as PDF\" নির্বাচন করুন"}
      right={<button onClick={() => window.print()} className="rounded-full bg-[var(--forest)] px-5 py-2.5 text-sm font-medium text-white transition hover:scale-105 hover:shadow-lg">PDF হিসেবে save ↓</button>}>
    <article className="space-y-6 rounded-2xl border border-black/5 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">

      <header className="border-b pb-4">
        <p className="text-xs uppercase tracking-wide text-emerald-700">CarbonIQ BD · GHG Inventory Summary · DEMO (synthetic data)</p>
        <h1 className="text-2xl font-bold">Demo Knit Factory, Gazipur</h1>
        <p className="text-sm text-gray-600">সময়কাল: {months[0] ?? "—"} থেকে {months[months.length - 1] ?? "—"} · তৈরি: {today}</p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        {([["মোট", total()], ["Scope 1", total(1)], ["Scope 2 (location-based)", total(2)]] as [string, number][]).map(([k, v]) => (
          <div key={k} className="rounded border p-3"><p className="text-xs text-gray-500">{k}</p><p className="text-xl font-bold">{v.toFixed(2)} tCO₂e</p></div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">মাসভিত্তিক হিসাব</h2>
        <table className="w-full text-sm">
          <thead className="border-b text-left"><tr><th className="py-1">মাস</th><th>ধরন</th><th>পরিমাণ</th><th>Scope</th><th className="text-right">kg CO₂e</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-1">{r.period_month.slice(0, 7)}</td><td>{ACTIVITY_LABEL[r.activity] ?? r.activity}</td>
                <td>{r.quantity.toLocaleString()} {r.unit}</td><td>{r.scope}</td><td className="text-right">{r.kg_co2e.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">পদ্ধতি ও গুণকের উৎস</h2>
        <p className="mb-2 text-sm">নির্গমন = কার্যক্রমের পরিমাণ × গুণক (GHG Protocol)। হিসাবে কোনো AI ব্যবহার হয়নি; একই input-এ সবসময় একই ফল।</p>
        <ul className="list-disc pl-5 text-sm">
          {sources.map((s) => <li key={s.activity}>{ACTIVITY_LABEL[s.activity] ?? s.activity}: {s.factor} kgCO₂e/{s.unit} — {s.factor_source} (v{s.factor_version})</li>)}
        </ul>
      </section>

      <section className="rounded bg-gray-50 p-3 text-sm">
        <h2 className="mb-1 font-semibold">প্রমাণ ও অখণ্ডতা</h2>
        <p>{rows.length}টা record, প্রতিটা মানুষের নিশ্চিত করা (L1) ও SHA-256 hash chain-এ সিল করা (L3)।</p>
        <p>Ledger যাচাই: {valid ? "✅ অক্ষত" : "⚠ যাচাই ব্যর্থ"}</p>
        <p className="break-all text-xs text-gray-500">শেষ hash: {lastHash}</p>
      </section>

      <footer className="border-t pt-3 text-xs text-gray-500">
        Emission factors: UK Government GHG Conversion Factors 2026 (OGL v3.0). Grid carbon intensity: Ember (CC-BY-4.0).
        এটা স্বাধীনভাবে নিরীক্ষিত (L4) report নয়। Demo factory-র সব সংখ্যা synthetic।
      </footer>
    </article>
    </Shell>
  );
}
