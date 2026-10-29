"use client";
import { buyerShare, type InProd, type InRow } from "@/lib/insights";

const FUEL: Record<string, [string, string]> = { electricity: ["বিদ্যুৎ (grid)", "#38bdf8"], natural_gas: ["প্রাকৃতিক গ্যাস", "#fb923c"], diesel: ["ডিজেল", "#f87171"], lpg: ["LPG", "#c084fc"] };
const BUYER_C = ["#c6f36b", "#86efac", "#5eead4", "#fde68a", "#a5b4fc"];

/** Carbon flow: জ্বালানি → Scope → buyer। প্রতিটা ব্যান্ডের প্রস্থ = টন CO₂e; সব ledger-এর হিসাব থেকে, যোগফল মোটের সমান */
export default function CarbonFlow({ rows, production }: { rows: InRow[]; production: InProd[] }) {
  const months = Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort().slice(-12);
  const yr = rows.filter((r) => months.includes(r.period_month.slice(0, 7)));
  const total = yr.reduce((s, r) => s + r.kg_co2e, 0) / 1000;
  if (!total) return null;
  const fuels = Object.keys(FUEL).map((a) => ({ id: a, t: yr.filter((r) => r.activity === a).reduce((s, r) => s + r.kg_co2e, 0) / 1000, scope: a === "electricity" ? 2 : 1 })).filter((f) => f.t > 0);
  const scopes = [1, 2].map((s) => ({ id: s, t: fuels.filter((f) => f.scope === s).reduce((a, f) => a + f.t, 0) })).filter((s) => s.t > 0);
  const buyers = buyerShare(yr, production, months[0], months.at(-1)).filter((b) => b.tonnes > 0);
  const unalloc = Math.max(0, total - buyers.reduce((a, b) => a + b.tonnes, 0));
  const right = [...buyers.map((b, i) => ({ id: b.buyer, t: b.tonnes, c: BUYER_C[i % BUYER_C.length], sub: `${b.kgPerPiece.toFixed(3)} kg/পিস` })), ...(unalloc > total * 0.005 ? [{ id: "উৎপাদন-তথ্য নেই", t: unalloc, c: "#64748b", sub: "যে মাসে পিসের হিসাব নেই" }] : [])];

  const W = 1000, H = 330, top = 16, gap = 14, colW = 14, X = [150, 500, 850];
  const scale = (H - top * 2 - gap * Math.max(fuels.length, right.length)) / total;
  const stack = <T extends { t: number }>(xs: T[]) => { let y = top; return xs.map((x) => { const r = { ...x, y, h: Math.max(2, x.t * scale) }; y += r.h + gap; return r; }); };
  const F = stack(fuels), Sc = stack(scopes), B = stack(right);
  const band = (x1: number, y1: number, x2: number, y2: number, h: number) => `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2} L${x2},${y2 + h} C${(x1 + x2) / 2},${y2 + h} ${(x1 + x2) / 2},${y1 + h} ${x1},${y1 + h} Z`;
  // জ্বালানি → scope
  const scOff: Record<number, number> = {}; const flows1 = F.map((f) => { const s = Sc.find((x) => x.id === f.scope)!; const o = scOff[s.id] ?? 0; scOff[s.id] = o + f.h; return { f, d: band(X[0] + colW, f.y, X[1], s.y + o, f.h) }; });
  // scope → buyer (প্রতিটা scope-কে buyer-এর অনুপাতে ভাগ)
  const bOff: Record<string, number> = {}; const sOut: Record<number, number> = {};
  const flows2 = Sc.flatMap((s) => B.map((b) => { const h = s.h * (b.t / total); const so = sOut[s.id] ?? 0; sOut[s.id] = so + h; const bo = bOff[b.id] ?? 0; bOff[b.id] = bo + h; return { s, b, d: band(X[1] + colW, s.y + so, X[2], b.y + bo, h) }; }));

  return (
    <div className="card mt-4 overflow-hidden p-6">
      <div className="flex flex-wrap items-end gap-2"><div><h2 className="font-bold">Carbon flow · কোথা থেকে কার কাছে</h2><p className="text-xs text-[var(--muted)]">শেষ ১২ মাস · জ্বালানি → Scope → buyer (উৎপাদিত পিসের অনুপাতে) · ব্যান্ডের প্রস্থ = টন CO₂e</p></div><p className="ml-auto text-sm font-bold tabular-nums">{total.toFixed(1)} tCO₂e</p></div>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full" role="img" aria-label="Carbon flow Sankey">
          {flows1.map(({ f, d }) => <path key={f.id} d={d} fill={FUEL[f.id][1]} opacity={0.35}><title>{`${FUEL[f.id][0]} → Scope ${f.scope}: ${f.t.toFixed(1)} t`}</title></path>)}
          {flows2.map(({ s, b, d }) => <path key={s.id + b.id} d={d} fill={b.c} opacity={0.4}><title>{`Scope ${s.id} → ${b.id}: ${(s.t * (b.t / total)).toFixed(1)} t`}</title></path>)}
          {F.map((f) => <g key={f.id}><rect x={X[0]} y={f.y} width={colW} height={f.h} rx={3} fill={FUEL[f.id][1]} /><text x={X[0] - 8} y={f.y + f.h / 2 - 2} textAnchor="end" fontSize="13" fontWeight="700" fill="var(--ink)">{FUEL[f.id][0]}</text><text x={X[0] - 8} y={f.y + f.h / 2 + 13} textAnchor="end" fontSize="11" fill="var(--muted)">{f.t.toFixed(1)} t · {((f.t / total) * 100).toFixed(0)}%</text></g>)}
          {Sc.map((s) => <g key={s.id}><rect x={X[1]} y={s.y} width={colW} height={s.h} rx={3} fill="var(--ink)" /><text x={X[1] + colW / 2} y={s.y - 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">Scope {s.id} · {s.t.toFixed(0)} t</text></g>)}
          {B.map((b) => <g key={b.id}><rect x={X[2]} y={b.y} width={colW} height={b.h} rx={3} fill={b.c} stroke="rgba(0,0,0,.15)" /><text x={X[2] + colW + 8} y={b.y + b.h / 2 - 2} fontSize="13" fontWeight="700" fill="var(--ink)">{b.id}</text><text x={X[2] + colW + 8} y={b.y + b.h / 2 + 13} fontSize="11" fill="var(--muted)">{b.t.toFixed(1)} t · {b.sub}</text></g>)}
        </svg>
      </div>
    </div>
  );
}
