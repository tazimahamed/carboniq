"use client";
import { useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { useRecords } from "@/lib/useRecords";
import { PROJECTS, evaluate, macc, optimize, type Baseline } from "@/lib/planner";
import { ASSUME_NOTE } from "@/lib/assumptions";

const lakh = (n: number) => `৳${(n / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} লাখ`;
const BUDGETS = [1_000_000, 2_500_000, 5_000_000, 10_000_000, 20_000_000];

export default function Planner() {
  const { rows, total, loading } = useRecords();
  const [budget, setBudget] = useState(5_000_000);
  const [goal, setGoal] = useState<"carbon" | "money">("carbon");
  const [manual, setManual] = useState<string[] | null>(null);

  const base: Baseline = useMemo(() => {
    const months = Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort().slice(-12);
    const inYr = rows.filter((r) => months.includes(r.period_month.slice(0, 7)));
    const sum = (a: string) => inYr.filter((r) => r.activity === a).reduce((s, r) => s + r.quantity, 0);
    return { kwh: sum("electricity"), gasM3: sum("natural_gas"), dieselL: sum("diesel") };
  }, [rows]);

  const best = useMemo(() => optimize(base, budget, goal), [base, budget, goal]);
  const chosen = manual ?? best.ids;
  const res = useMemo(() => evaluate(PROJECTS.filter((p) => chosen.includes(p.id)), base), [chosen, base]);
  const curve = useMemo(() => macc(base), [base]);
  const totalT = total();
  const toggle = (id: string) => setManual((m) => { const cur = m ?? best.ids; return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; });
  const overBudget = res.capex > budget;

  if (!loading && !rows.length) return <Shell eyebrow="Optimize" title="বিনিয়োগ পরিকল্পনা"><p className="card p-6 text-sm text-[var(--muted)]">আগে Dashboard-এ demo data যোগ করুন বা বিল upload করুন।</p></Shell>;

  // MACC chart মাপ
  const mT = curve.reduce((a, p) => a + p.tYr, 0) || 1;
  const maxPos = Math.max(0, ...curve.map((p) => p.tkPerT)), maxNeg = Math.max(0, ...curve.map((p) => -p.tkPerT));
  const span = Math.max(1, maxPos + maxNeg), zero = (maxPos / span) * 100; // শূন্যরেখা উপর থেকে কত %

  return (
    <Shell eyebrow="Optimize · খরচ ও কার্বন কমানো" title="বিনিয়োগ পরিকল্পনা" sub="বাজেট দিন — ১০টা সম্ভাব্য প্রকল্পের প্রতিটা সমন্বয় (১০২৪টা) পরীক্ষা করে সেরাটা বের করা হয়">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        {/* নিয়ন্ত্রণ + ফল */}
        <div className="space-y-4">
          <div className="card p-6">
            <p className="text-sm font-bold">বাজেট</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <button key={b} onClick={() => { setBudget(b); setManual(null); }} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${budget === b ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] hover:border-[var(--leaf)]"}`}>{lakh(b)}</button>
              ))}
            </div>
            <input type="range" min={500000} max={25000000} step={500000} value={budget} onChange={(e) => { setBudget(Number(e.target.value)); setManual(null); }} className="mt-4 w-full accent-[var(--leaf)]" aria-label="বাজেট" />
            <p className="mt-1 text-right text-sm font-semibold tabular-nums">{lakh(budget)}</p>
            <p className="mt-4 text-sm font-bold">লক্ষ্য</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([["carbon", "সবচেয়ে বেশি কার্বন কমানো"], ["money", "সবচেয়ে বেশি টাকা বাঁচানো"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => { setGoal(k); setManual(null); }} className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${goal === k ? "border-[var(--leaf)] bg-emerald-50 ring-2 ring-[var(--leaf)]/20" : "border-[var(--line)] hover:border-black/20"}`}>{l}</button>
              ))}
            </div>
          </div>

          <div className="grain relative overflow-hidden rounded-[18px] bg-[var(--ink)] p-6 text-white">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--leaf)]/30 blur-3xl" />
            <div className="relative flex items-center gap-2">
              <p className="text-sm text-white/60">{manual ? "আপনার বাছাই" : "সেরা পরিকল্পনা"}</p>
              {manual && <button onClick={() => setManual(null)} className="ml-auto text-xs text-[var(--lime)] hover:underline">সেরাটায় ফিরুন</button>}
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-4">
              <div><p className="text-[30px] font-extrabold leading-none text-[var(--lime)]">{lakh(res.tkYr)}</p><p className="mt-1 text-xs text-white/55">বছরে আনুমানিক সাশ্রয়</p></div>
              <div><p className="text-[30px] font-extrabold leading-none">{res.tYr.toFixed(0)} <span className="text-base">টন</span></p><p className="mt-1 text-xs text-white/55">বছরে CO₂e কম · মোটের {totalT ? ((res.tYr / totalT) * 100).toFixed(0) : 0}%</p></div>
              <div><p className={`text-xl font-bold ${overBudget ? "text-red-300" : ""}`}>{lakh(res.capex)}</p><p className="text-xs text-white/55">বিনিয়োগ {overBudget && "· বাজেটের বেশি"}</p></div>
              <div><p className="text-xl font-bold">{isFinite(res.paybackYears) ? `${res.paybackYears.toFixed(1)} বছর` : "—"}</p><p className="text-xs text-white/55">খরচ উঠে আসবে</p></div>
            </div>
          </div>
        </div>

        {/* প্রকল্প তালিকা */}
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4"><h2 className="font-bold">প্রকল্প</h2><p className="text-xs text-[var(--muted)]">✓ = পরিকল্পনায় আছে · click করে নিজে বদলাতে পারেন</p></div>
          <ul className="divide-y divide-[var(--line)]">
            {PROJECTS.map((p) => {
              const on = chosen.includes(p.id), one = evaluate([p], base);
              return (
                <li key={p.id}>
                  <button onClick={() => toggle(p.id)} className={`flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-[var(--paper)] ${on ? "bg-emerald-50/50" : ""}`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold ${on ? "border-[var(--leaf)] bg-[var(--leaf)] text-white" : "border-[var(--line)]"}`}>{on ? "✓" : ""}</span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{p.name}</span><span className="block truncate text-xs text-[var(--muted)]">{p.what}</span></span>
                    <span className="text-right text-xs tabular-nums"><span className="block font-semibold">{lakh(p.capexTk)}</span><span className="block text-[var(--muted)]">{one.tYr.toFixed(0)} t · {one.paybackYears.toFixed(1)} বছর</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* MACC */}
      <div className="card mt-4 p-6">
        <h2 className="font-bold">Marginal Abatement Cost Curve (MACC)</h2>
        <p className="text-xs text-[var(--muted)]">প্রতিটা bar একটা প্রকল্প — চওড়া = বছরে কত টন কমায়, গভীরতা = প্রতি টন কমাতে নিট কত টাকা বাঁচে (রেখার নিচে = লাভ, উপরে = খরচ)। গাঢ় = পরিকল্পনায় আছে</p>
        <div className="relative mt-8 flex h-48 items-stretch">
          <div className="absolute inset-x-0 h-px bg-[var(--ink)]/40" style={{ top: `${zero}%` }} />
          <span className="absolute -top-4 right-0 text-[10px] text-[var(--muted)]">{maxPos > 0 ? "খরচ ↑" : ""}</span>
          {curve.map((p) => {
            const h = (Math.abs(p.tkPerT) / span) * 100, neg = p.tkPerT < 0, on = chosen.includes(p.id);
            return (
              <div key={p.id} className="group relative h-full" style={{ width: `${(p.tYr / mT) * 100}%` }} title={`${p.name}: ${Math.round(p.tkPerT).toLocaleString()} ৳/টন, ${p.tYr.toFixed(0)} টন/বছর`}>
                <div className={`absolute inset-x-[1px] rounded-sm ${on ? "bg-[var(--leaf)]" : "bg-[var(--leaf)]/30"}`} style={neg ? { top: `${zero}%`, height: `${h}%` } : { bottom: `${100 - zero}%`, height: `${h}%` }} />
                <span className="absolute left-1/2 top-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[var(--ink)] px-2 py-1 text-[10px] text-white group-hover:block">{p.name}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[var(--muted)]"><span>← কম খরচে বেশি লাভ</span><span>মোট সম্ভাব্য {mT.toFixed(0)} টন/বছর →</span></div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--muted)]">
          {curve.map((p, i) => <span key={p.id}>{i + 1}. {p.name} ({Math.round(p.tkPerT).toLocaleString()} ৳/t)</span>)}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
        প্রকল্পের খরচ ও সাশ্রয়ের হার সাধারণ শিল্প-অনুমান (আনুমানিক); আসল প্রকল্পের আগে energy audit দরকার। একাধিক প্রকল্পের শতাংশ সাশ্রয় গুণফলে যোগ হয়, যাতে দ্বিগুণ গোনা না হয়। ভিত্তি: শেষ ১২ মাসের বিদ্যুৎ {base.kwh.toLocaleString()} kWh, গ্যাস {base.gasM3.toLocaleString()} m³, ডিজেল {base.dieselL.toLocaleString()} লিটার। {ASSUME_NOTE}।
      </p>
    </Shell>
  );
}
