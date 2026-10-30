"use client";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import Method from "@/components/Method";
import { useRecords } from "@/lib/useRecords";
import { buildTwin, simulate, TWIN_ASSUME, TWIN_PROJECTS, type TwinInput } from "@/lib/twin";
import { DHAKA_TEMP } from "@/lib/demoModel";
import { ASSUME_ROWS } from "@/lib/assumptions";

const MONTHS = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
const n0 = (n: number) => Math.round(n).toLocaleString("en-US");

export default function TwinPage() {
  const { rows, production, loading } = useRecords();
  const twin = useMemo(() => (rows.length && production.length ? buildTwin(rows, production) : null), [rows, production]);
  const [inp, setInp] = useState<TwinInput | null>(null);
  const [monthIdx, setMonthIdx] = useState(4);
  useEffect(() => {
    if (twin && !inp) setInp({ pieces: Math.round(twin.avg.pieces / 1000) * 1000, temp: DHAKA_TEMP[4], outageH: Math.round(twin.avg.outageH * 10) / 10, gridChangePct: 0, projects: [] });
  }, [twin, inp]);
  const base = useMemo(() => (twin && inp ? simulate(twin, { ...inp, projects: [], gridChangePct: 0 }) : null), [twin, inp]);
  const sim = useMemo(() => (twin && inp ? simulate(twin, inp) : null), [twin, inp]);

  if (!loading && !rows.length) return <Shell eyebrow="Simulate" title="Energy Twin"><p className="card p-6 text-sm text-[var(--muted)]">আগে Dashboard-এ Demo reset করুন।</p></Shell>;
  const set = (k: keyof TwinInput, v: number | string[]) => setInp((x) => (x ? { ...x, [k]: v } : x));
  const delta = sim && base ? ((sim.total - base.total) / base.total) * 100 : 0;

  return (
    <Shell eyebrow="Simulate · Energy Digital Twin" title="কারখানার Energy Twin" sub="আসল বিল থেকে শেখা ভার্চুয়াল কারখানা — উৎপাদন, গরম, load-shedding বা প্রকল্প বদলালে কী হয়, অনিশ্চয়তাসহ" wide>
      {twin && inp && sim && base ? (
        <div className="grain relative overflow-hidden rounded-[22px] bg-[#07130e] text-white shadow-2xl">
          <div className="grid-bg absolute inset-0 opacity-40" />
          <div className="relative grid gap-0 xl:grid-cols-[280px_1fr_270px]">
            {/* নিয়ন্ত্রণ */}
            <aside className="space-y-5 border-b border-white/10 p-5 xl:border-b-0 xl:border-r">
              <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--lime)]" /><p className="text-sm font-bold">Simulation নিয়ন্ত্রণ</p></div>
              <Slider label="মাসিক উৎপাদন" value={inp.pieces} min={Math.round(twin.avg.pieces * 0.6 / 1000) * 1000} max={Math.round(twin.avg.pieces * 1.4 / 1000) * 1000} step={5000} fmt={(v) => `${n0(v)} পিস`} onChange={(v) => set("pieces", v)} />
              <div>
                <div className="flex justify-between text-xs"><span className="text-white/70">মাস (ঢাকার গড় তাপমাত্রা)</span><span className="font-semibold">{inp.temp}°C</span></div>
                <div className="mt-2 grid grid-cols-6 gap-1">
                  {MONTHS.map((m, i) => <button key={m} onClick={() => { setMonthIdx(i); set("temp", DHAKA_TEMP[i]); }} className={`rounded-md py-1 text-[11px] transition ${monthIdx === i ? "bg-[var(--lime)] font-bold text-[var(--ink)]" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>{m}</button>)}
                </div>
              </div>
              <Slider label="Load-shedding (দিনে গড় ঘণ্টা)" value={inp.outageH} min={0} max={6} step={0.1} fmt={(v) => `${v.toFixed(1)} ঘণ্টা`} onChange={(v) => set("outageH", v)} />
              <Slider label="Grid আরো পরিষ্কার / নোংরা হলে" value={inp.gridChangePct} min={-40} max={20} step={5} fmt={(v) => `${v > 0 ? "+" : ""}${v}% গুণক`} onChange={(v) => set("gridChangePct", v)} />
              <div>
                <p className="text-xs text-white/70">প্রকল্প চালু করুন</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TWIN_PROJECTS.map((p) => { const on = inp.projects.includes(p.id); return <button key={p.id} onClick={() => set("projects", on ? inp.projects.filter((x) => x !== p.id) : [...inp.projects, p.id])} className={`rounded-full border px-2.5 py-1 text-[11px] transition ${on ? "border-[var(--lime)] bg-lime/15 text-[var(--lime)]" : "border-white/15 text-white/60 hover:border-white/40"}`}>{p.name}</button>; })}
                </div>
              </div>
              <button onClick={() => { setInp(null); setMonthIdx(4); }} className="w-full rounded-full border border-white/15 py-2 text-xs text-white/70 hover:bg-white/5">↺ শুরুর অবস্থায়</button>
            </aside>

            {/* Isometric কারখানা */}
            <div className="relative min-h-[420px] p-3">
              <div className="flex flex-wrap items-center gap-3 px-2 pt-2">
                <p className="text-sm font-bold">Isometric কারখানা · zone অনুযায়ী নির্গমন</p>
                <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] text-sky-200">Simulation চালু</span>
                <HeatLegend />
              </div>
              <Iso zones={sim.zones} />
              <p className="px-2 text-[10px] text-white/40">Zone-ভাগ শিল্প-অনুমান (knit composite) — মোট সংখ্যা আসল model থেকে; sub-meter দিলে zone-ও আসল হবে</p>
            </div>

            {/* KPI */}
            <aside className="space-y-3 border-t border-white/10 p-5 xl:border-l xl:border-t-0">
              <Kpi label="মাসিক নির্গমন" value={`${sim.total.toFixed(1)} t`} sub={`± ${sim.u.toFixed(1)} t (৯০%) · শুরুর তুলনায় ${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`} tone={delta <= 0 ? "good" : "bad"} />
              <Kpi label="প্রতি পিসে" value={`${sim.kgPerPiece.toFixed(3)} kg`} sub="CO₂e / পিস" />
              <Kpi label="মাসিক জ্বালানি খরচ" value={`৳${(sim.tk / 100000).toFixed(1)} লাখ`} sub={`শুরুর তুলনায় ${sim.tk - base.tk > 0 ? "+" : "−"}৳${Math.abs((sim.tk - base.tk) / 100000).toFixed(1)} লাখ (আনুমানিক)`} tone={sim.tk <= base.tk ? "good" : "bad"} />
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-xs">
                <p className="text-white/60">জ্বালানি অনুযায়ী</p>
                {[["বিদ্যুৎ", sim.kwh, "kWh", sim.tE, "#38bdf8"], ["গ্যাস", sim.gas, "m³", sim.tG, "#fb923c"], ["ডিজেল", sim.diesel, "লিটার", sim.tD, "#f87171"]].map(([l, q, u, t, c]) => (
                  <div key={l as string} className="mt-2"><div className="flex justify-between"><span>{l as string} · {n0(q as number)} {u as string}</span><span className="tabular-nums">{(t as number).toFixed(1)} t</span></div><div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${((t as number) / sim.total) * 100}%`, background: c as string }} /></div></div>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-xs">
                <p className="text-white/60">Twin কতটা নির্ভুল (backtest)</p>
                {twin.backtest.map((b) => <p key={b.activity} className="mt-1.5 flex justify-between"><span>{b.activity === "electricity" ? "বিদ্যুৎ" : "গ্যাস"}</span><span className={`tabular-nums ${b.mape < 5 ? "text-[var(--lime)]" : "text-amber-300"}`}>গড় ভুল {b.mape.toFixed(1)}% ({b.n} মাস)</span></p>)}
                <p className="mt-2 text-[10px] text-white/40">প্রতিটা মাস বাদ দিয়ে বাকিগুলো দিয়ে শিখে সেই মাস অনুমান (leave-one-out MAPE)</p>
              </div>
            </aside>
          </div>
        </div>
      ) : <div className="h-[520px] animate-pulse rounded-[22px] bg-[#07130e]" />}

      <Method className="mt-4" rows={[
        { k: "Model", v: "বিদ্যুৎ = b₀ + b₁·উৎপাদন + b₂·তাপমাত্রা; গ্যাস = b₀ + b₁·উৎপাদন (least squares, শেষ ১২ মাস)", src: "কারখানার ledger; অনিশ্চয়তা prediction interval থেকে" },
        { k: "নির্ভুলতা", v: "প্রতিটা মাস বাদ দিয়ে বাকিগুলো দিয়ে শিখে সেই মাস অনুমান (leave-one-out MAPE)" },
        { k: "তাপমাত্রা", v: "ঢাকার মাসিক গড়", est: true, src: "আনুমানিক climatology" },
        { k: "ডিজেল", v: TWIN_ASSUME.note, est: true },
        { k: "Zone-ভাগ", v: "Knit composite কারখানার সাধারণ ভাগ", est: true, src: "sub-meter দিলে আসল হবে" },
        { k: "প্রকল্প", v: "Planner-এর একই সাশ্রয়-হার", est: true },
        ...ASSUME_ROWS,
      ]} />
    </Shell>
  );
}

function Slider({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs"><span className="text-white/70">{label}</span><span className="font-semibold tabular-nums">{fmt(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--lime)]" />
    </label>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      <p className={`text-[11px] ${tone === "good" ? "text-[var(--lime)]" : tone === "bad" ? "text-amber-300" : "text-white/50"}`}>{sub}</p>
    </div>
  );
}

// ---------- isometric ----------
const HEAT = [[30, 64, 175], [14, 165, 233], [250, 204, 21], [249, 115, 22], [239, 68, 68]];
function heat(v: number) {
  const x = Math.max(0, Math.min(1, v)) * (HEAT.length - 1), i = Math.min(HEAT.length - 2, Math.floor(x)), f = x - i;
  const c = HEAT[i].map((a, k) => Math.round(a + (HEAT[i + 1][k] - a) * f));
  return (d = 1) => `rgb(${c.map((a) => Math.round(a * d)).join(",")})`;
}
function HeatLegend() {
  return <span className="ml-auto flex items-center gap-1.5 text-[10px] text-white/50">কম<i className="h-2 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${HEAT.map((c) => `rgb(${c.join(",")})`).join(",")})` }} />বেশি</span>;
}

const LAYOUT: Record<string, [number, number, number, number]> = { // x, y, w, d (ইউনিট)
  knit: [0, 0, 4, 3], dye: [4.6, 0, 4.2, 3], util: [9.4, 0, 2.8, 3], cut: [0, 3.6, 2.6, 3], sew: [3.2, 3.6, 5.6, 3], gen: [9.4, 3.6, 2.8, 3],
};
function Iso({ zones }: { zones: { id: string; name: string; t: number }[] }) {
  const S = 40, cx = 330, cy = 60;
  const P = (x: number, y: number, z: number) => [cx + (x - y) * S * 0.866, cy + (x + y) * S * 0.5 - z * S] as const;
  const max = Math.max(...zones.map((z) => z.t)) || 1;
  const order = [...zones].sort((a, b) => (LAYOUT[a.id][0] + LAYOUT[a.id][1]) - (LAYOUT[b.id][0] + LAYOUT[b.id][1]));
  const pts = (arr: (readonly [number, number])[]) => arr.map((p) => p.join(",")).join(" ");
  const grid = P(-1.2, 5.2, 0);
  return (
    <svg viewBox="0 0 760 440" className="w-full" role="img" aria-label="Isometric factory twin">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" /></filter>
        <style>{`.flow{stroke-dasharray:6 10;animation:flow 1.4s linear infinite}@keyframes flow{to{stroke-dashoffset:-32}}@media (prefers-reduced-motion:reduce){.flow{animation:none}}`}</style>
      </defs>
      {/* মেঝের গ্রিড */}
      {Array.from({ length: 15 }, (_, i) => i - 1).map((i) => <g key={i} stroke="rgba(198,243,107,.07)"><line x1={P(i, -1, 0)[0]} y1={P(i, -1, 0)[1]} x2={P(i, 8, 0)[0]} y2={P(i, 8, 0)[1]} /><line x1={P(-1, i * 0.7, 0)[0]} y1={P(-1, i * 0.7, 0)[1]} x2={P(13, i * 0.7, 0)[0]} y2={P(13, i * 0.7, 0)[1]} /></g>)}
      {/* Grid থেকে প্রবাহ */}
      <g><circle cx={grid[0]} cy={grid[1]} r={16} fill="#0ea5e9" opacity={0.18} /><text x={grid[0]} y={grid[1] + 4} textAnchor="middle" fontSize="11" fill="#7dd3fc" fontWeight="700">GRID</text></g>
      {order.filter((z) => z.id !== "gen").map((z) => { const [x, y, w, d] = LAYOUT[z.id], c = P(x + w / 2, y + d / 2, 0.25 + Math.sqrt(z.t / max) * 1.7); return <path key={"f" + z.id} d={`M${grid[0]},${grid[1]} Q${(grid[0] + c[0]) / 2},${Math.min(grid[1], c[1]) - 60} ${c[0]},${c[1]}`} fill="none" stroke="#38bdf8" strokeOpacity={0.5} strokeWidth={1.6} className="flow" />; })}
      {order.map((z) => {
        const [x, y, w, d] = LAYOUT[z.id], v = z.t / max, h = 0.25 + Math.sqrt(v) * 1.7, col = heat(v);
        const top = [P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)];
        const left = [P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)];
        const right = [P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)];
        return (
          <g key={z.id}>
            <polygon points={pts(top)} fill={col()} filter="url(#glow)" opacity={0.35 + v * 0.5} />
            <polygon points={pts(left)} fill={col(0.45)} stroke={col()} strokeOpacity={0.6} />
            <polygon points={pts(right)} fill={col(0.3)} stroke={col()} strokeOpacity={0.6} />
            <polygon points={pts(top)} fill={col(0.85)} fillOpacity={0.75} stroke={col()} strokeWidth={1.2} />
          </g>
        );
      })}
      {order.map((z) => {
        const [x, y, w, d] = LAYOUT[z.id], v = z.t / max, lc = P(x + w / 2, y + d / 2, 0.25 + Math.sqrt(v) * 1.7), col = heat(v);
        return (
          <g key={"l" + z.id} transform={`translate(${lc[0]},${lc[1] - 22})`}>
            <line x1={0} y1={16} x2={0} y2={22} stroke="rgba(255,255,255,.3)" />
            <rect x={-60} y={-20} width={120} height={36} rx={7} fill="rgba(7,19,14,.9)" stroke="rgba(255,255,255,.15)" />
            <text y={-5} textAnchor="middle" fontSize="10.5" fill="#fff" fontWeight="700">{z.name}</text>
            <text y={10} textAnchor="middle" fontSize="10" fill={col()}>{z.t.toFixed(1)} tCO₂e</text>
          </g>
        );
      })}
    </svg>
  );
}
