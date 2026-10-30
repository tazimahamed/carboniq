"use client";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { useRecords } from "@/lib/useRecords";
import { PROJECTS, evaluate, macc, optimize, type Baseline } from "@/lib/planner";
import { ASSUME_NOTE } from "@/lib/assumptions";
import { intensity, monthBn } from "@/lib/insights";
import { targetRisk } from "@/lib/target";

const lakh = (n: number) => `৳${(n / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} লাখ`;
const BUDGETS = [1_000_000, 2_500_000, 5_000_000, 10_000_000, 20_000_000];

export default function Planner() {
  const { rows, production, total, loading } = useRecords();
  const [budget, setBudget] = useState(5_000_000);
  const [goal, setGoal] = useState<"carbon" | "money">("carbon");
  const [manual, setManual] = useState<string[] | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [geo, setGeo] = useState<{ kwp: number; kwhYr: number; capex: number | null; areaM2?: number; ghi?: number; src?: string } | null>(null);
  // Geo-র Rooftop Solar Scanner থেকে পাঠানো ছাদ থাকলে solar প্রকল্পে সেটাই ব্যবহার
  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem("carboniq_solar") || "null");
      const sp = PROJECTS.find((p) => p.id === "solar");
      if (g && sp && g.kwp > 0 && g.kwhYr > 0) { sp.name = `ছাদে solar (${g.kwp} kWp, আপনার ছাদ)`; sp.what = "Geo-তে আঁকা ছাদ ও NASA POWER সূর্যালোক থেকে"; sp.capexTk = g.capex ?? Math.round((13_500_000 / 300) * g.kwp); sp.solarKwhYr = g.kwhYr; setGeo(g);
        if (location.hash === "#solar") setTimeout(() => document.getElementById("p-solar")?.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }
    } catch { /* storage বন্ধ */ }
  }, []);

  const base: Baseline = useMemo(() => {
    const months = Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort().slice(-12);
    const inYr = rows.filter((r) => months.includes(r.period_month.slice(0, 7)));
    const sum = (a: string) => inYr.filter((r) => r.activity === a).reduce((s, r) => s + r.quantity, 0);
    return { kwh: sum("electricity"), gasM3: sum("natural_gas"), dieselL: sum("diesel") };
  }, [rows]);

  const best = useMemo(() => optimize(base, budget, goal), [base, budget, goal, geo, tick]);
  const other = useMemo(() => optimize(base, budget, goal === "carbon" ? "money" : "carbon"), [base, budget, goal, geo, tick]);
  const sameAsOther = best.ids.slice().sort().join() === other.ids.slice().sort().join();
  const chosen = manual ?? best.ids;
  const res = useMemo(() => evaluate(PROJECTS.filter((p) => chosen.includes(p.id)), base), [chosen, base, geo, tick]);
  const curve = useMemo(() => macc(base), [base, geo, tick]);
  const totalT = total();
  const toggle = (id: string) => setManual((m) => { const cur = m ?? best.ids; return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; });
  const overBudget = res.capex > budget;

  if (!loading && !rows.length) return <Shell eyebrow="Optimize" title="বিনিয়োগ পরিকল্পনা"><p className="card p-6 text-sm text-[var(--muted)]">আগে Dashboard-এ demo data যোগ করুন বা বিল upload করুন।</p></Shell>;

  // MACC chart মাপ
  const mT = curve.reduce((a, p) => a + p.tYr, 0) || 1;

  return (
    <Shell eyebrow="Optimize · খরচ ও কার্বন কমানো" title="বিনিয়োগ পরিকল্পনা" sub="বাজেট দিন — ১০টা সম্ভাব্য প্রকল্পের প্রতিটা সমন্বয় (১০২৪টা) পরীক্ষা করে সেরাটা বের করা হয়">
      {geo && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm">
          <span className="text-lg">☀</span>
          <p className="min-w-0 flex-1"><b>Geo থেকে আপনার ছাদ যুক্ত হয়েছে:</b> {geo.areaM2 ? `${geo.areaM2.toLocaleString()} m² ছাদ · ` : ""}{geo.kwp.toLocaleString()} kWp · বছরে {Math.round(geo.kwhYr / 1000).toLocaleString()} MWh{geo.ghi ? ` (NASA POWER ${geo.ghi.toFixed(2)} kWh/m²/দিন)` : ""} · খরচ {geo.capex ? `আপনার quotation ${lakh(geo.capex)}` : "quotation দেওয়া হয়নি — Planner-এর সাধারণ অনুমান"}। নিচে &quot;ছাদে solar&quot; প্রকল্প এই মান দিয়ে হিসাব হচ্ছে।</p>
          <a href="/geo" className="text-xs font-semibold text-[var(--leaf)] hover:underline">ছাদ বদলান</a>
          <button onClick={() => { try { localStorage.removeItem("carboniq_solar"); } catch {} location.reload(); }} className="text-xs text-red-600 hover:underline">সরিয়ে দিন</button>
        </div>
      )}
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
                <button key={k} onClick={() => { setGoal(k); setManual(null); }} className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${goal === k ? "border-[var(--leaf)] bg-emerald-50 ring-2 ring-leaf/20" : "border-[var(--line)] hover:border-black/20"}`}>{l}</button>
              ))}
            </div>
          </div>

          <div className="grain relative overflow-hidden rounded-[18px] bg-[var(--ink)] p-6 text-white">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-leaf/30 blur-3xl" />
            <div className="relative flex items-center gap-2">
              <p className="text-sm text-white/60">{manual ? "আপনার বাছাই" : "সেরা পরিকল্পনা"}</p>
              {manual && <button onClick={() => setManual(null)} className="ml-auto text-xs text-[var(--lime)] hover:underline">সেরাটায় ফিরুন</button>}
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-4">
              <div><p className="text-[30px] font-extrabold leading-none text-[var(--lime)]">{lakh(res.tkYr)}</p><p className="mt-1 text-xs text-white/55">বছরে আনুমানিক সাশ্রয়</p></div>
              <div><p className="text-[30px] font-extrabold leading-none">{res.tYr.toFixed(0)} <span className="text-base">টন</span></p><p className="mt-1 text-xs text-white/55">বছরে CO₂e কম · মোটের {totalT ? ((res.tYr / totalT) * 100).toFixed(0) : 0}%</p></div>
              <div><p className={`text-xl font-bold ${overBudget ? "text-red-300" : ""}`}>{lakh(res.capex)}</p><p className="text-xs text-white/55">বিনিয়োগ {overBudget && "· বাজেটের বেশি"}</p></div>
              <div><p className="text-xl font-bold">{isFinite(res.paybackYears) ? `${res.paybackYears.toFixed(1)} বছর` : "—"}</p><p className="text-xs text-white/55">খরচ উঠে আসবে</p></div>
              <div><p className={`text-xl font-bold ${res.npv < 0 ? "text-red-300" : ""}`}>{lakh(res.npv)}</p><p className="text-xs text-white/55">আয়ুষ্কালে নিট লাভ (NPV, ১০% discount)</p></div>
              <div><p className="text-xl font-bold">{res.tLife.toFixed(0)} টন</p><p className="text-xs text-white/55">আয়ুষ্কালে মোট CO₂e কম</p></div>
            </div>
            {!manual && sameAsOther && <p className="relative mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/75">এই বাজেটে দুই লক্ষ্যেই একই সমন্বয় সেরা হয়েছে — কম খরচের দ্রুত-লাভের প্রকল্পগুলো কার্বন আর টাকা দুই দিকেই এগিয়ে। ৳১০ লাখ বা ৳১৫০ লাখে দেখুন, ফল আলাদা হয়।</p>}
            {!manual && !sameAsOther && <p className="relative mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/75">{goal === "carbon" ? `টাকার লক্ষ্যে বছরে ${other.tYr.toFixed(0)} টন কমত, কিন্তু NPV ${lakh(other.npv)}` : `কার্বনের লক্ষ্যে বছরে ${other.tYr.toFixed(0)} টন কমত, NPV ${lakh(other.npv)}`}</p>}
          </div>
        </div>

        {/* প্রকল্প তালিকা */}
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4"><h2 className="font-bold">প্রকল্প</h2><p className="text-xs text-[var(--muted)]">✓ = পরিকল্পনায় আছে · click করে নিজে বদলাতে পারেন</p></div>
          <ul className="divide-y divide-[var(--line)]">
            {PROJECTS.map((p) => {
              const on = chosen.includes(p.id), one = evaluate([p], base);
              return (
                <li key={p.id} id={`p-${p.id}`} className={p.id === "solar" && geo ? "ring-2 ring-inset ring-yellow-300" : ""}>
                  <button onClick={() => toggle(p.id)} className={`flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-[var(--paper)] ${on ? "bg-emerald-50/50" : ""}`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold ${on ? "border-[var(--leaf)] bg-[var(--leaf)] text-white" : "border-[var(--line)]"}`}>{on ? "✓" : ""}</span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{p.name}</span><span className="block truncate text-xs text-[var(--muted)]">{p.what}</span></span>
                    <span className="text-right text-xs tabular-nums"><span className="block font-semibold">{lakh(p.capexTk)}</span><span className="block text-[var(--muted)]">{one.tYr.toFixed(0)} t · {one.paybackYears.toFixed(1)} বছর</span></span>
                  </button>
                  <div className="flex flex-wrap items-center gap-2 px-5 pb-3 text-[11px]" style={{ paddingLeft: 52 }}>
                    {p.src ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-800" title={p.src}>📄 প্রকল্প-স্তরে উৎস আছে</span> : <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">⚠ প্রকাশিত উৎস নেই — অনুমান</span>}
                    <button onClick={() => setEdit(edit === p.id ? null : p.id)} className="text-[var(--leaf)] hover:underline">{edit === p.id ? "বন্ধ" : "উৎস দেখুন / নিজের মান দিন"}</button>
                  </div>
                  {edit === p.id && (
                    <div className="mx-5 mb-3 space-y-2 rounded-xl bg-[var(--paper)] p-3 text-xs">
                      {p.src && <p><b>উৎস:</b> {p.src}</p>}
                      <p><b>কারখানা-স্তরে কীভাবে ধরা:</b> {p.basis}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label>বিনিয়োগ (৳)<input inputMode="numeric" defaultValue={p.capexTk} onBlur={(e) => { const v = Number(e.target.value.replace(/[^\d]/g, "")); if (v > 0) { p.capexTk = v; setTick((t) => t + 1); } }} className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1" /></label>
                        {(["elecPct", "gasPct", "dieselPct"] as const).filter((k) => p[k] !== undefined).map((k) => (
                          <label key={k}>{k === "elecPct" ? "মোট বিদ্যুতের" : k === "gasPct" ? "মোট গ্যাসের" : "মোট ডিজেলের"} কত % কমবে<input inputMode="decimal" defaultValue={((p[k] ?? 0) * 100).toString()} onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v <= 100) { p[k] = v / 100; setTick((t) => t + 1); } }} className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1" /></label>
                        ))}
                      </div>
                      <p className="text-[var(--muted)]">বদলালে optimizer, MACC আর ফল সাথে সাথে নতুন মানে হিসাব হয় (এই browser-এ, এই পাতায়)।</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <TargetCard rows={rows} production={production} planCutPct={totalT ? (res.tYr / totalT) * 100 : 0} />

      {/* MACC */}
      <div className="card mt-4 p-6">
        <h2 className="font-bold">Marginal Abatement Cost Curve (MACC)</h2>
        <p className="text-xs text-[var(--muted)]">প্রতিটা bar একটা প্রকল্প — চওড়া = বছরে কত টন কমায়, উচ্চতা = প্রতি টন কমাতে নিট কত টাকা (শূন্যরেখার নিচে = লাভ, উপরে = খরচ)। গাঢ় সবুজ = পরিকল্পনায় আছে, হালকা = নেই</p>
        <MaccChart curve={curve} chosen={chosen} total={mT} />
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--muted)]">
          {curve.map((p, i) => <span key={p.id} className={chosen.includes(p.id) ? "font-semibold text-[var(--ink)]" : ""}>{i + 1}. {p.name} ({Math.round(p.tkPerT).toLocaleString()} ৳/t)</span>)}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
        প্রকল্পের খরচ ও সাশ্রয়ের হার সাধারণ শিল্প-অনুমান (আনুমানিক); আসল প্রকল্পের আগে energy audit দরকার। একাধিক প্রকল্পের শতাংশ সাশ্রয় গুণফলে যোগ হয়, যাতে দ্বিগুণ গোনা না হয়। "কার্বন" লক্ষ্যে বছরে সর্বোচ্চ টন কমানো, "টাকা" লক্ষ্যে প্রকল্পের পুরো আয়ুষ্কালের সর্বোচ্চ নিট লাভ (NPV, ১০% discount rate) বাছা হয়। ভিত্তি: শেষ ১২ মাসের বিদ্যুৎ {base.kwh.toLocaleString()} kWh, গ্যাস {base.gasM3.toLocaleString()} m³, ডিজেল {base.dieselL.toLocaleString()} লিটার। {ASSUME_NOTE}।{geo ? ` Solar প্রকল্প: Geo-তে আঁকা আপনার ছাদ (${geo.kwp} kWp, বছরে ${Math.round(geo.kwhYr / 1000)} MWh, NASA POWER সূর্যালোক; খরচ ${geo.capex ? "আপনার quotation" : "Planner-এর সাধারণ অনুমান"})।` : ""}
      </p>
    </Shell>
  );
}

type Bar = { id: string; name: string; tYr: number; tkPerT: number };
function MaccChart({ curve, chosen, total }: { curve: Bar[]; chosen: string[]; total: number }) {
  const W = 1000, H = 260, L = 64, R = 12, T = 16, B = 34;
  const vals = curve.map((p) => p.tkPerT).filter(isFinite);
  const hi = Math.max(0, ...vals), lo = Math.min(0, ...vals);
  const step = niceStep((hi - lo) / 4 || 1);
  const top = Math.ceil(hi / step) * step, bot = Math.floor(lo / step) * step;
  const y = (v: number) => T + ((top - v) / (top - bot || 1)) * (H - T - B);
  const x = (t: number) => L + (t / total) * (W - L - R);
  const ticks: number[] = [];
  for (let v = bot; v <= top + 1e-9; v += step) ticks.push(v);
  let cum = 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-5 w-full" role="img" aria-label="MACC chart">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={v === 0 ? 0.55 : 0.08} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{(v / 1000).toFixed(0)}k</text>
        </g>
      ))}
      <text x={12} y={T + (H - T - B) / 2} fontSize="12" fill="var(--muted)" transform={`rotate(-90 12 ${T + (H - T - B) / 2})`} textAnchor="middle">৳ / টন</text>
      {curve.map((p, i) => {
        const x0 = x(cum); cum += p.tYr; const x1 = x(cum);
        const v = isFinite(p.tkPerT) ? p.tkPerT : 0, y0 = y(0), y1 = y(v), on = chosen.includes(p.id);
        const w = Math.max(1, x1 - x0 - 2);
        return (
          <g key={p.id}>
            <title>{`${p.name}: ${Math.round(v).toLocaleString()} ৳/টন · ${p.tYr.toFixed(0)} টন/বছর`}</title>
            <rect x={x0 + 1} width={w} y={Math.min(y0, y1)} height={Math.max(1, Math.abs(y1 - y0))} rx={3}
              fill={on ? "var(--leaf)" : "#bfe3cf"} stroke={on ? "none" : "var(--leaf)"} strokeOpacity={0.5} />
            {w > 18 && <text x={x0 + 1 + w / 2} y={Math.max(y0, y1) - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill={on ? "#fff" : "var(--ink)"}>{i + 1}</text>}
          </g>
        );
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <text key={f} x={x(total * f)} y={H - 10} fontSize="12" fill="var(--muted)" textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"}>{(total * f).toFixed(0)} t</text>
      ))}
    </svg>
  );
}
function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function TargetCard({ rows, production, planCutPct }: { rows: Parameters<typeof intensity>[0]; production: Parameters<typeof intensity>[1]; planCutPct: number }) {
  const series = useMemo(() => intensity(rows, production), [rows, production]);
  const [pct, setPct] = useState(10);
  const last = series.at(-1)?.month ?? "2026-10";
  const opts = useMemo(() => { const [y, m] = last.split("-").map(Number); return [6, 12, 18].map((k) => { const d = new Date(Date.UTC(y, m - 1 + k, 1)); return d.toISOString().slice(0, 7); }); }, [last]);
  const [when, setWhen] = useState("");
  const tm = when || opts[1];
  const r = targetRisk(series, pct, tm, planCutPct);
  if (!r) return null;
  const lo = Math.min(r.lo, r.target, r.withPlan) * 0.97, hi = Math.max(r.hi, r.baseline, r.current) * 1.02;
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const tone = r.risk === "বেশি" ? "bg-red-100 text-red-800" : r.risk === "মাঝারি" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800";
  return (
    <div className="card mt-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div><h2 className="font-bold">Buyer-এর লক্ষ্য · মিসের ঝুঁকি</h2><p className="text-xs text-[var(--muted)]">প্রতি পিসের নির্গমনের মাসিক ধারা থেকে পূর্বাভাস (৯০% সীমাসহ) — তথ্য কম, তাই নিশ্চয়তা নয়, ঝুঁকি</p></div>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${tone}`}>ঝুঁকি: {r.risk}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">লক্ষ্য: প্রতি পিসে
          <select value={pct} onChange={(e) => setPct(Number(e.target.value))} className="rounded-lg border border-[var(--line)] bg-white px-2 py-1">{[5, 10, 15, 20, 30].map((v) => <option key={v} value={v}>{v}%</option>)}</select> কম</label>
        <label className="flex items-center gap-2">সময়সীমা
          <select value={tm} onChange={(e) => setWhen(e.target.value)} className="rounded-lg border border-[var(--line)] bg-white px-2 py-1">{opts.map((o) => <option key={o} value={o}>{monthBn(o)}</option>)}</select></label>
      </div>
      <div className="relative mt-8 h-14">
        <div className="absolute inset-x-0 top-6 h-1 rounded-full bg-[var(--paper)]" />
        <div className="absolute top-4 h-5 rounded-full bg-sky-200/70" style={{ left: pos(r.lo), width: `calc(${pos(r.hi)} - ${pos(r.lo)})` }} title="৯০% সম্ভাব্য সীমা" />
        {[["baseline", r.baseline, "bg-gray-400", "শুরু"], ["current", r.current, "bg-[var(--ink)]", "এখন"], ["proj", r.projected, "bg-sky-600", "এই ধারায়"], ["plan", r.withPlan, "bg-[var(--leaf)]", "পরিকল্পনাসহ"]].map(([k, v, c, l], i) => (
          <div key={k as string} className="absolute -translate-x-1/2 text-center" style={{ left: pos(v as number), top: i % 2 ? 30 : -18 }}>
            {i % 2 ? <><span className={`mx-auto block h-3 w-3 rounded-full ${c}`} /><span className="whitespace-nowrap text-[10px] text-[var(--muted)]">{l as string} {(v as number).toFixed(3)}</span></> : <><span className="whitespace-nowrap text-[10px] text-[var(--muted)]">{l as string} {(v as number).toFixed(3)}</span><span className={`mx-auto mt-0.5 block h-3 w-3 rounded-full ${c}`} /></>}
          </div>
        ))}
        <div className="absolute top-1 h-10 w-0.5 bg-red-500" style={{ left: pos(r.target) }}><span className="absolute -top-4 left-1 whitespace-nowrap text-[10px] font-bold text-red-600">লক্ষ্য {r.target.toFixed(3)}</span></div>
      </div>
      <p className="mt-6 text-sm">{r.text}। পরিকল্পনার প্রকল্পগুলো নিলে অনুমান <b>{r.withPlan.toFixed(3)} kg/পিস</b> {r.withPlan <= r.target ? "— লক্ষ্যের নিচে ✓" : "— এখনো লক্ষ্যের উপরে, বাজেট বাড়ান বা আরো প্রকল্প নিন"}।</p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">শুরু = প্রথম ৩ মাসের গড়; এখন = শেষ ৩ মাসের গড়; ধারা প্রতি মাসে {r.slopePctPerMonth > 0 ? "+" : ""}{r.slopePctPerMonth.toFixed(2)}%। পরিকল্পনার প্রভাব = বার্ষিক কমানো ÷ মোট নির্গমন (আনুমানিক)।</p>
    </div>
  );
}
