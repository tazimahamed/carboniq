"use client";
import Link from "next/link";
import { useState } from "react";
import { useRecords } from "@/lib/useRecords";
import { ACTIVITY_LABEL } from "@/lib/factors";

export default function Dashboard() {
  const { rows, valid, error, loading, total, reload } = useRecords();
  const [seeding, setSeeding] = useState("");

  async function seed() {
    setSeeding("Demo data বানানো হচ্ছে... (৩০ সেকেন্ড পর্যন্ত লাগতে পারে)");
    const j = await fetch("/api/demo/seed", { method: "POST" }).then((r) => r.json());
    setSeeding(j.error ? j.error : `${j.months} মাসের demo data যোগ হয়েছে`);
    reload();
  }

  const months = Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort();
  const byMonth = months.map((m) => ({ m, t: rows.filter((r) => r.period_month.startsWith(m)).reduce((a, r) => a + r.kg_co2e, 0) / 1000 }));
  const max = Math.max(1, ...byMonth.map((x) => x.t));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-gray-500">Demo Knit Factory, Gazipur</span>
        <Link href="/report" className="ml-auto rounded bg-emerald-700 px-3 py-1.5 text-sm text-white">Report (PDF)</Link>
      </div>
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {([["মোট", total()], ["Scope 1 (জ্বালানি)", total(1)], ["Scope 2 (বিদ্যুৎ)", total(2)]] as [string, number][]).map(([k, v]) => (
          <div key={k} className="rounded border bg-white p-4">
            <p className="text-sm text-gray-500">{k}</p>
            <p className="text-2xl font-bold">{v.toFixed(2)} টন CO₂e</p>
          </div>
        ))}
      </div>

      <p className="text-sm">
        Ledger: {loading ? "যাচাই হচ্ছে..." : valid === null ? "যাচাই করা যায়নি" : valid ? `✅ অক্ষত — ${rows.length}টা record, কোনোটা বদলানো হয়নি` : "⚠ গরমিল পাওয়া গেছে"}
      </p>

      {!loading && rows.length === 0 && !error && (
        <div className="rounded border border-dashed bg-white p-4 text-sm">
          এখনো কোনো ডেটা নেই। <button onClick={seed} className="underline">১২ মাসের demo data যোগ করুন</button>
        </div>
      )}
      {seeding && <p className="text-sm text-gray-600">{seeding}</p>}

      {byMonth.length > 0 && (
        <div className="rounded border bg-white p-4">
          <p className="mb-3 text-sm text-gray-500">মাসভিত্তিক নির্গমন (টন CO₂e)</p>
          <div className="flex h-40 items-end gap-1">
            {byMonth.map((x) => (
              <div key={x.m} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-emerald-600" style={{ height: `${(x.t / max) * 100}%` }} title={`${x.t.toFixed(1)} টন`} />
                <span className="text-[10px] text-gray-500">{x.m.slice(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <table className="w-full rounded border bg-white text-sm">
        <thead className="bg-gray-50 text-left"><tr><th className="p-2">মাস</th><th>ধরন</th><th>পরিমাণ</th><th>Scope</th><th>kg CO₂e</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.period_month.slice(0, 7)}</td><td>{ACTIVITY_LABEL[r.activity] ?? r.activity}</td>
              <td>{r.quantity.toLocaleString()} {r.unit}</td><td>{r.scope}</td><td>{r.kg_co2e.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
