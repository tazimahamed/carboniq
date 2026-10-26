"use client";
import { useEffect, useState } from "react";

type Row = { id: string; activity: string; quantity: number; unit: string; period_month: string; scope: number; kg_co2e: number; hash: string };

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/records").then((r) => r.json()).then((j) => j.error ? setError(j.error) : setRows(j.records));
    fetch("/api/ledger/verify").then((r) => r.json()).then((j) => setValid(j.valid));
  }, []);

  const total = (s?: number) => rows.filter((r) => !s || r.scope === s).reduce((a, r) => a + r.kg_co2e, 0) / 1000;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {error && <p className="text-red-600">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {[["মোট", total()], ["Scope 1", total(1)], ["Scope 2", total(2)]].map(([k, v]) => (
          <div key={k as string} className="rounded border bg-white p-4">
            <p className="text-sm text-gray-500">{k}</p>
            <p className="text-2xl font-bold">{(v as number).toFixed(2)} টন</p>
          </div>
        ))}
      </div>
      <p className="text-sm">
        Ledger: {valid === null ? "যাচাই হচ্ছে..." : valid ? "✅ অক্ষত — কোনো record বদলানো হয়নি" : "⚠ গরমিল পাওয়া গেছে"}
      </p>
      <table className="w-full rounded border bg-white text-sm">
        <thead className="bg-gray-50 text-left"><tr><th className="p-2">মাস</th><th>ধরন</th><th>পরিমাণ</th><th>Scope</th><th>kg CO₂e</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.period_month.slice(0, 7)}</td><td>{r.activity}</td>
              <td>{r.quantity} {r.unit}</td><td>{r.scope}</td><td>{r.kg_co2e.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
