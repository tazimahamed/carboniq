"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRecords, type Row } from "@/lib/useRecords";
import { ACTIVITY_LABEL } from "@/lib/factors";
import Shell from "@/components/Shell";
import { CountUp } from "@/components/fx";
import { anomalies, evidenceScore, generator, intensity } from "@/lib/insights";
import { ASSUME_NOTE } from "@/lib/assumptions";

const BN_MONTH = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
const monthLabel = (m: string) => `${BN_MONTH[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(2, 4)}`;
const fmt = (n: number, d = 1) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const FUEL_COLOR: Record<string, string> = { electricity: "#7ee0a8", natural_gas: "#1f8a5b", diesel: "#c6f36b", lpg: "#f0b443" };
const FUEL_SHORT: Record<string, string> = { electricity: "বিদ্যুৎ", natural_gas: "প্রাকৃতিক গ্যাস", diesel: "ডিজেল", lpg: "LPG" };

const Ico = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

/** ছোট রেখা-চিত্র (KPI card-এ) */
function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values), span = Math.max(1e-9, max - min);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline points={`0,30 ${pts} 100,30`} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Scope ভাগের ring */
function Ring({ parts }: { parts: { v: number; c: string }[] }) {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  let acc = 0; const R = 42, C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90" aria-hidden>
      <circle cx="50" cy="50" r={R} fill="none" stroke="var(--line)" strokeWidth="11" />
      {parts.map((p, i) => {
        const len = (p.v / total) * C; const el = (
          <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={p.c} strokeWidth="11" strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-acc} />
        ); acc += len; return el;
      })}
    </svg>
  );
}

export default function Dashboard() {
  const { rows, production, valid, error, loading, total, reload } = useRecords();
  const [msg, setMsg] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  async function reset() {
    if (!confirm("Demo-র সব ডেটা আর upload করা বিল মুছে নতুন ১২ মাসের demo data বসানো হবে। চালিয়ে যাবেন?")) return;
    setMsg("Demo আবার শুরু হচ্ছে...");
    try {
      const j = await fetch("/api/demo/reset", { method: "POST" }).then((r) => r.json());
      setMsg(j.error ? j.error : `Demo নতুন করে শুরু হয়েছে (${j.records}টা record)`);
    } catch { setMsg("Server সময়মতো উত্তর দেয়নি — আবার চেষ্টা করুন"); }
    reload();
  }
  async function seed() {
    setMsg("Demo data বানানো হচ্ছে...");
    try {
      const j = await fetch("/api/demo/seed", { method: "POST" }).then((r) => r.json());
      setMsg(j.error ? j.error : `${j.months} মাসের demo data যোগ হয়েছে (${j.records}টা record)`);
    } catch { setMsg("Server সময়মতো উত্তর দেয়নি — page refresh করে আবার চেষ্টা করুন"); }
    reload();
  }

  const d = useMemo(() => {
    const months = Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort();
    const byMonth = months.map((m) => {
      const rs = rows.filter((r) => r.period_month.startsWith(m));
      const s1 = rs.filter((r) => r.scope === 1).reduce((a, r) => a + r.kg_co2e, 0) / 1000;
      const s2 = rs.filter((r) => r.scope === 2).reduce((a, r) => a + r.kg_co2e, 0) / 1000;
      return { m, s1, s2, t: s1 + s2 };
    });
    const fuels = Object.keys(FUEL_COLOR).map((a) => ({ a, t: rows.filter((r) => r.activity === a).reduce((s, r) => s + r.kg_co2e, 0) / 1000 })).filter((f) => f.t > 0);
    const peak = byMonth.reduce((a, b) => (b.t > a.t ? b : a), byMonth[0] ?? { m: "", t: 0, s1: 0, s2: 0 });
    const last = byMonth.at(-1), prev = byMonth.at(-2);
    const change = last && prev && prev.t ? ((last.t - prev.t) / prev.t) * 100 : null;
    return { months, byMonth, fuels, peak, last, change, max: Math.max(1, ...byMonth.map((x) => x.t)) };
  }, [rows]);

  const t = total(), s1 = total(1), s2 = total(2);
  const ins = useMemo(() => ({
    ev: evidenceScore(rows, valid),
    it: intensity(rows, production),
    an: anomalies(rows, production),
    gen: generator(rows),
  }), [rows, production, valid]);
  const lastIt = ins.it.at(-1), prevIt = ins.it.at(-2);
  const itChange = lastIt && prevIt ? ((lastIt.kgPerPiece - prevIt.kgPerPiece) / prevIt.kgPerPiece) * 100 : null;
  const avgKgPiece = ins.it.length ? ins.it.reduce((a, x) => a + x.tonnes * 1000, 0) / ins.it.reduce((a, x) => a + x.pieces, 0) : null;
  const bills = rows.filter((r) => r.has_bill).length;
  const meterOk = rows.filter((r) => r.meter_ok).length;
  const shown: Row[] = filter === "all" ? rows : rows.filter((r) => r.activity === filter);

  return (
    <Shell eyebrow="Demo Knit Factory · গাজীপুর" title="Dashboard"
      sub={d.months.length ? `${monthLabel(d.months[0])} থেকে ${monthLabel(d.months.at(-1)!)} · নিশ্চিত ও hash-সিল করা record থেকে` : "নিশ্চিত ও hash-সিল করা record থেকে"}
      right={<div className="flex items-center gap-2">
        <button onClick={reset} className="btn-ghost-dark rounded-full px-4 py-2 text-sm transition" title="Demo-র সব ডেটা মুছে নতুন করে শুরু">↺ Demo reset</button>
        <Link href="/report" className="btn-lime rounded-full px-5 py-2 text-sm font-bold transition">Report (PDF) →</Link>
      </div>}>

      {error && <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {msg && <p className="mb-6 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">{msg}</p>}

      {!loading && rows.length === 0 && !error ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--lime)]/25 text-[var(--forest)]"><Ico d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" className="h-6 w-6" /></span>
          <p className="mt-5 text-lg font-bold">এখনো কোনো হিসাব নেই</p>
          <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">প্রথম বিল upload করুন, অথবা ১২ মাসের synthetic demo data দিয়ে পুরো dashboard দেখুন।</p>
          <div className="mt-6 flex gap-3">
            <button onClick={seed} className="btn-lime rounded-full px-5 py-2.5 text-sm font-bold">Demo data যোগ করুন</button>
            <Link href="/upload" className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium hover:border-[var(--leaf)]">বিল upload</Link>
          </div>
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="grain relative overflow-hidden rounded-[18px] bg-[var(--ink)] p-5 text-white">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--leaf)]/30 blur-2xl" />
              <p className="relative text-[13px] text-white/60">মোট নির্গমন</p>
              <p className="relative mt-1 text-[32px] font-extrabold tracking-tight">{loading ? "—" : <CountUp to={t} decimals={1} />}<span className="ml-1 text-sm font-semibold text-[var(--lime)]">tCO₂e</span></p>
              <div className="relative mt-2"><Spark values={d.byMonth.map((x) => x.t)} color="#c6f36b" /></div>
              <p className="relative mt-1 text-xs text-white/50">{d.months.length} মাস · মাসে গড় {fmt(d.months.length ? t / d.months.length : 0)} টন</p>
            </div>
            {[
              { k: "Scope 1 · জ্বালানি", v: s1, c: "#1f8a5b", vals: d.byMonth.map((x) => x.s1), sub: t ? `মোটের ${fmt((s1 / t) * 100, 0)}%` : "—" },
              { k: "Scope 2 · বিদ্যুৎ", v: s2, c: "#4cc38a", vals: d.byMonth.map((x) => x.s2), sub: t ? `মোটের ${fmt((s2 / t) * 100, 0)}%` : "—" },
            ].map((s) => (
              <div key={s.k} className="card p-5">
                <p className="text-[13px] text-[var(--muted)]">{s.k}</p>
                <p className="mt-1 text-[28px] font-extrabold tracking-tight">{loading ? "—" : <CountUp to={s.v} decimals={1} />}<span className="ml-1 text-sm font-semibold text-[var(--muted)]">tCO₂e</span></p>
                <div className="mt-2"><Spark values={s.vals} color={s.c} /></div>
                <p className="mt-1 text-xs text-[var(--muted)]">{s.sub}</p>
              </div>
            ))}
            <div className="card p-5">
              <p className="text-[13px] text-[var(--muted)]">প্রতি পিসে নির্গমন</p>
              {avgKgPiece !== null ? (<>
                <p className="mt-1 text-[28px] font-extrabold tracking-tight">{avgKgPiece.toFixed(3)}<span className="ml-1 text-sm font-semibold text-[var(--muted)]">kg CO₂e</span></p>
                <div className="mt-2"><Spark values={ins.it.map((x) => x.kgPerPiece)} color="#0f3d2e" /></div>
                {itChange !== null && (Math.abs(itChange) < 0.05
                  ? <p className="mt-1 text-xs text-[var(--muted)]">শেষ মাসে অপরিবর্তিত</p>
                  : <p className={`mt-1 text-xs font-semibold ${itChange > 0 ? "text-amber-700" : "text-emerald-700"}`}>{itChange > 0 ? "▲" : "▼"} {fmt(Math.abs(itChange))}% শেষ মাসে</p>)}
              </>) : (
                <p className="mt-3 text-sm text-[var(--muted)]">উৎপাদনের ডেটা যোগ করলে প্রতি পিসের হিসাব দেখাবে</p>
              )}
            </div>
          </div>

          {/* Evidence Score + smart সতর্কবার্তা */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="card p-6">
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90" aria-hidden>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="9" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={ins.ev.score >= 85 ? "#1f8a5b" : ins.ev.score >= 65 ? "#4cc38a" : ins.ev.score >= 45 ? "#f0b443" : "#e07a5f"} strokeWidth="9" strokeLinecap="round"
                      strokeDasharray={`${(ins.ev.score / 100) * 263.9} 263.9`} />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div><p className="text-[28px] font-extrabold leading-none">{ins.ev.score}</p><p className="text-[10px] text-[var(--muted)]">/১০০</p></div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">Evidence Score</h2>
                  <p className="text-xs text-[var(--muted)]">ডেটা কতটা প্রমাণসহ · {ins.ev.grade}</p>
                  <ul className="mt-3 space-y-1.5">
                    {ins.ev.parts.map((p) => (
                      <li key={p.key} className="text-xs" title={p.note}>
                        <div className="flex justify-between gap-3"><span className="truncate">{p.label}</span><span className="shrink-0 font-semibold tabular-nums">{p.got}/{p.max}</span></div>
                        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--leaf)]" style={{ width: `${(p.got / p.max) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {ins.ev.actions.length > 0 && (
                <div className="mt-5 rounded-xl bg-[var(--paper)] p-3.5">
                  <p className="text-xs font-bold">Score বাড়াতে</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-[var(--muted)]">{ins.ev.actions.map((a) => <li key={a}>• {a}</li>)}</ul>
                </div>
              )}
              <p className="mt-3 text-[10px] text-[var(--muted)]">CarbonIQ-এর নিজস্ব মান-নির্দেশক, কোনো সরকারি সনদ নয়।</p>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2">
                <h2 className="font-bold">Smart সতর্কবার্তা</h2>
                <span className="rounded-full bg-[var(--paper)] px-2 py-0.5 text-xs text-[var(--muted)]">{ins.an.length + (ins.gen.total.litres ? 1 : 0)}</span>
              </div>
              <p className="text-xs text-[var(--muted)]">প্রতিটা মাসকে বাকি মাসের উৎপাদন আর তাপমাত্রা দিয়ে শেখা model-এর সাথে তুলনা</p>
              <div className="mt-4 space-y-3">
                {ins.an.slice(0, 3).map((a) => (
                  <div key={a.month + a.activity} className={`rounded-xl border p-4 ${a.severity === "high" ? "border-amber-300 bg-amber-50/70" : "border-amber-200 bg-amber-50/40"}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-bold text-white">!</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-amber-950">{a.title}</p>
                        <p className="mt-0.5 text-xs text-amber-900/80">{a.detail}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span>আসল <b className="tabular-nums">{Math.round(a.actual).toLocaleString()}</b></span>
                          <span>প্রত্যাশিত <b className="tabular-nums">{Math.round(a.expected).toLocaleString()}</b></span>
                          <span className="font-semibold text-amber-900">আনুমানিক ক্ষতি ৳{Math.round(a.tkLoss).toLocaleString("en-IN")} · {a.extraT.toFixed(1)} টন বাড়তি</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {ins.gen.total.litres > 0 && (
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[var(--lime)]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">Load-shedding: জেনারেটরে বাড়তি ৳{Math.round(ins.gen.total.tkExtra / 100000 * 10) / 10} লাখ</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{ins.gen.total.litres.toLocaleString()} লিটার ডিজেল, grid-এর চেয়ে প্রতি kWh অনেক দামি · সবচেয়ে বেশি {ins.gen.peak ? monthLabel(ins.gen.peak.month) : ""}-এ</p>
                        <div className="mt-2 flex h-8 items-end gap-1">
                          {ins.gen.months.map((g) => (
                            <div key={g.month} className="flex-1 rounded-t-sm bg-[var(--forest)]/70" style={{ height: `${(g.litres / (ins.gen.peak?.litres || 1)) * 100}%` }} title={`${monthLabel(g.month)}: ${g.litres} L`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {ins.an.length === 0 && !ins.gen.total.litres && <p className="rounded-xl bg-[var(--paper)] p-4 text-sm text-[var(--muted)]">কোনো অস্বাভাবিকতা পাওয়া যায়নি।</p>}
              </div>
              <p className="mt-3 text-[10px] text-[var(--muted)]">{ASSUME_NOTE}। Demo ডেটা synthetic।</p>
            </div>
          </div>

          {/* chart + বিভাজন */}
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.85fr_1fr]">
            <div className="card p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <h2 className="font-bold">মাসভিত্তিক নির্গমন</h2>
                  <p className="text-xs text-[var(--muted)]">টন CO₂e · bar-এ mouse রাখলে বিস্তারিত</p>
                </div>
                <div className="ml-auto flex gap-4 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--forest)]" />Scope 1</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#7ee0a8]" />Scope 2</span>
                </div>
              </div>
              <div className="relative mt-6 h-64 pl-11">
                {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                  <div key={f} className="absolute inset-x-0 flex items-center" style={{ bottom: `${f * 100}%` }}>
                    <span className="w-9 pr-2 text-right text-[11px] tabular-nums text-[var(--muted)]">{Math.round(d.max * f)}</span>
                    <span className={`h-px flex-1 ${f === 0 ? "bg-[var(--line)]" : "border-t border-dashed border-[var(--line)]"}`} />
                  </div>
                ))}
                <div className="relative flex h-full items-end gap-1.5 sm:gap-2.5">
                  {d.byMonth.map((x) => {
                    const on = hover === x.m;
                    return (
                      <div key={x.m} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(x.m)} onMouseLeave={() => setHover(null)}>
                        {on && (
                          <div className="absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-xl bg-[var(--ink)] p-3 text-xs text-white shadow-2xl">
                            <p className="font-bold">{monthLabel(x.m)}</p>
                            <p className="mt-1.5 flex justify-between text-white/70"><span>Scope 1</span><span>{fmt(x.s1)} t</span></p>
                            <p className="flex justify-between text-white/70"><span>Scope 2</span><span>{fmt(x.s2)} t</span></p>
                            <p className="mt-1.5 flex justify-between border-t border-white/10 pt-1.5 font-bold text-[var(--lime)]"><span>মোট</span><span>{fmt(x.t)} t</span></p>
                          </div>
                        )}
                        <div className={`mx-auto flex w-[70%] max-w-[34px] flex-col overflow-hidden rounded-t-[5px] transition-opacity duration-200 ${hover && !on ? "opacity-35" : ""}`} style={{ height: `${(x.t / d.max) * 100}%` }}>
                          <div className="bg-[#7ee0a8]" style={{ height: `${x.t ? (x.s2 / x.t) * 100 : 0}%` }} />
                          <div className="flex-1 bg-[var(--forest)]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-2 flex gap-1.5 pl-11 sm:gap-2.5">
                {d.byMonth.map((x) => <span key={x.m} className="flex-1 text-center text-[10px] text-[var(--muted)]">{monthLabel(x.m)}</span>)}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-bold">নির্গমন কোথা থেকে</h2>
              <p className="text-xs text-[var(--muted)]">জ্বালানি অনুযায়ী ভাগ</p>
              <div className="mt-4 flex items-center gap-5">
                <div className="relative">
                  <Ring parts={d.fuels.map((f) => ({ v: f.t, c: FUEL_COLOR[f.a] }))} />
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div><p className="text-lg font-extrabold">{fmt(t, 0)}</p><p className="text-[10px] text-[var(--muted)]">টন</p></div>
                  </div>
                </div>
                <ul className="flex-1 space-y-2.5 text-sm">
                  {d.fuels.map((f) => (
                    <li key={f.a}>
                      <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FUEL_COLOR[f.a] }} /><span className="flex-1">{FUEL_SHORT[f.a]}</span><span className="font-semibold tabular-nums">{fmt((f.t / (t || 1)) * 100, 0)}%</span></div>
                      <div className="ml-[18px] mt-1 h-1 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full" style={{ width: `${(f.t / (t || 1)) * 100}%`, background: FUEL_COLOR[f.a] }} /></div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-5 text-center">
                <div><p className="text-xs text-[var(--muted)]">Scope 1</p><p className="mt-0.5 font-bold">{fmt(s1)} t</p></div>
                <div><p className="text-xs text-[var(--muted)]">Scope 2</p><p className="mt-0.5 font-bold">{fmt(s2)} t</p></div>
              </div>
            </div>
          </div>

          {/* দ্রুত কাজ */}
          <div className="mt-4">
            <div className="card p-6">
              <h2 className="font-bold">দ্রুত কাজ</h2>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {[
                  { href: "/upload", t: "নতুন বিল upload", s: "ছবি, HEIC বা PDF", d: "M12 4v12M6 10l6-6 6 6M4 20h16" },
                  { href: "/report", t: "Buyer report বানান", s: "উৎস ও hash-সহ PDF", d: "M6 2h9l5 5v15H6V2zM9 13h7M9 17h7" },
                  { href: "/copilot", t: "Copilot-কে জিজ্ঞেস করুন", s: "\"কোন মাসে সবচেয়ে বেশি?\"", d: "M4 4h16v12H8l-4 4V4z" },
                ].map((a) => (
                  <Link key={a.href} href={a.href} className="group flex items-center gap-3 rounded-xl border border-[var(--line)] p-3 transition hover:border-[var(--leaf)]/40 hover:bg-[var(--paper)]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--ink)] text-[var(--lime)]"><Ico d={a.d} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{a.t}</span><span className="block truncate text-xs text-[var(--muted)]">{a.s}</span></span>
                    <span className="text-[var(--muted)] transition group-hover:translate-x-0.5">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* record table */}
          <div className="card mt-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-4">
              <h2 className="font-bold">সব record</h2>
              <span className="rounded-full bg-[var(--paper)] px-2.5 py-0.5 text-xs text-[var(--muted)]">{shown.length}টা</span>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {[["all", "সব"], ...Object.keys(FUEL_SHORT).filter((a) => rows.some((r) => r.activity === a)).map((a) => [a, FUEL_SHORT[a]])].map(([k, l]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === k ? "bg-[var(--ink)] text-white" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="max-h-[440px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-[1] bg-[#fafaf7] text-left text-xs font-semibold text-[var(--muted)]">
                  <tr><th className="px-5 py-3">মাস</th><th>ধরন</th><th className="text-right">পরিমাণ</th><th className="pl-6">Scope</th><th className="text-right">kg CO₂e</th><th className="pl-6">প্রমাণ</th><th className="pr-5">Hash</th></tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--line)] transition-colors hover:bg-[var(--paper)]">
                      <td className="whitespace-nowrap px-5 py-3 font-medium">{monthLabel(r.period_month.slice(0, 7))}</td>
                      <td className="whitespace-nowrap"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: FUEL_COLOR[r.activity] }} />{FUEL_SHORT[r.activity] ?? ACTIVITY_LABEL[r.activity] ?? r.activity}</span></td>
                      <td className="whitespace-nowrap text-right tabular-nums">{r.quantity.toLocaleString()} <span className="text-[var(--muted)]">{r.unit}</span></td>
                      <td className="pl-6"><span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${r.scope === 1 ? "bg-[var(--forest)] text-white" : "bg-[#d9f5e5] text-[var(--forest)]"}`}>S{r.scope}</span></td>
                      <td className="text-right font-semibold tabular-nums">{fmt(r.kg_co2e)}</td>
                      <td className="whitespace-nowrap pl-6">{r.has_bill
                        ? <a href={`/api/bill?record=${r.record_id}`} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100">বিল দেখুন{r.meter_ok ? " ✓" : ""}</a>
                        : <span className="text-xs text-[var(--muted)]">synthetic</span>}</td>
                      <td className="pr-5 font-mono text-[11px] text-[var(--muted)]" title={r.hash}>{r.hash.slice(0, 10)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
