// Dashboard-এর বুদ্ধিমত্তা: Evidence Score, প্রতি পিস নির্গমন, প্রত্যাশিত বনাম আসল, জেনারেটর।
// pure function — React ছাড়া, তাই আলাদাভাবে পরীক্ষা করা যায়।
import { ASSUME } from "./assumptions";
import { DHAKA_TEMP } from "./demoModel";

export type InRow = { activity: string; quantity: number; period_month: string; scope: number; kg_co2e: number; has_bill: boolean; meter_ok: boolean | null };
export type InProd = { period_month: string; buyer: string; pieces: number };

const ym = (s: string) => s.slice(0, 7);
const BN_MONTH = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
export const monthBn = (m: string) => `${BN_MONTH[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(0, 4)}`;
const ACT = { electricity: "বিদ্যুৎ", natural_gas: "গ্যাস", diesel: "ডিজেল", lpg: "LPG" } as Record<string, string>;

/** প্রথম থেকে শেষ মাস পর্যন্ত সব মাস */
export function monthRange(from: string, to: string) {
  const out: string[] = []; let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) { out.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

// ================= Evidence Score =================
export type ScorePart = { key: string; label: string; got: number; max: number; note: string };
export type Evidence = { score: number; grade: string; parts: ScorePart[]; actions: string[]; missing: { month: string; activity: string }[] };

export function evidenceScore(rows: InRow[], ledgerValid: boolean | null): Evidence {
  const actions: string[] = [];
  if (!rows.length) return { score: 0, grade: "—", parts: [], actions: ["প্রথম বিল upload করুন"], missing: [] };
  const months = Array.from(new Set(rows.map((r) => ym(r.period_month)))).sort();
  const all = monthRange(months[0], months.at(-1)!);
  const core = ["electricity", "natural_gas"].filter((a) => rows.some((r) => r.activity === a));
  const missing: { month: string; activity: string }[] = [];
  for (const m of all) for (const a of core) if (!rows.some((r) => r.activity === a && ym(r.period_month) === m)) missing.push({ month: m, activity: a });
  const expected = all.length * core.length || 1;
  const coverage = 1 - missing.length / expected;

  const bills = rows.filter((r) => r.has_bill);
  const billShare = bills.length / rows.length;
  const meterShare = bills.length ? bills.filter((r) => r.meter_ok).length / bills.length : 0;
  const keys = rows.map((r) => `${r.activity}|${ym(r.period_month)}`);
  const dupes = keys.length - new Set(keys).size;

  const parts: ScorePart[] = [
    { key: "coverage", label: "মাসের পূর্ণতা", got: Math.round(30 * coverage), max: 30, note: missing.length ? `${missing.length}টা মাস-বিল বাদ` : "কোনো মাস বাদ নেই" },
    { key: "bills", label: "মূল বিল সংযুক্ত (L2)", got: Math.round(25 * billShare), max: 25, note: `${bills.length}/${rows.length} record-এ মূল বিল` },
    { key: "meter", label: "মিটার রিডিং মিলেছে", got: Math.round(15 * billShare * meterShare), max: 15, note: bills.length ? `${bills.filter((r) => r.meter_ok).length}/${bills.length} বিলে মিলেছে` : "কোনো বিল নেই" },
    { key: "ledger", label: "Ledger অক্ষত (L3)", got: ledgerValid ? 20 : 0, max: 20, note: ledgerValid ? "hash chain যাচাই হয়েছে" : ledgerValid === false ? "গরমিল পাওয়া গেছে" : "যাচাই হয়নি" },
    { key: "dupes", label: "ডুপ্লিকেট নেই", got: dupes ? 0 : 10, max: 10, note: dupes ? `${dupes}টা ডুপ্লিকেট` : "একই মাস দুবার গোনা হয়নি" },
  ];
  const score = parts.reduce((a, p) => a + p.got, 0);

  for (const x of missing.slice(0, 2)) actions.push(`${monthBn(x.month)}-এর ${ACT[x.activity]} বিল যোগ করুন`);
  if (billShare < 1) actions.push(`${rows.length - bills.length}টা record-এ মূল বিল নেই — বিলের ছবি upload করুন (+${25 - Math.round(25 * billShare)} পর্যন্ত)`);
  if (bills.length && meterShare < 1) actions.push("যে বিলে মিটার রিডিং মেলেনি, সেগুলো আবার দেখুন");
  if (ledgerValid === false) actions.push("Ledger-এ গরমিল — auditor-কে জানান");
  const grade = score >= 85 ? "উচ্চ" : score >= 65 ? "ভালো" : score >= 45 ? "মাঝারি" : "দুর্বল";
  return { score, grade, parts, actions: actions.slice(0, 3), missing };
}

// ================= প্রতি পিস =================
export type Intensity = { month: string; pieces: number; tonnes: number; kgPerPiece: number };
export function intensity(rows: InRow[], prod: InProd[]): Intensity[] {
  const months = Array.from(new Set(prod.map((p) => ym(p.period_month)))).sort();
  return months.map((m) => {
    const pieces = prod.filter((p) => ym(p.period_month) === m).reduce((a, p) => a + p.pieces, 0);
    const kg = rows.filter((r) => ym(r.period_month) === m).reduce((a, r) => a + r.kg_co2e, 0);
    return { month: m, pieces, tonnes: kg / 1000, kgPerPiece: pieces ? kg / pieces : 0 };
  }).filter((x) => x.pieces > 0 && x.tonnes > 0);
}

/** Buyer অনুযায়ী ভাগ (উৎপাদনের অনুপাতে) */
export function buyerShare(rows: InRow[], prod: InProd[], from?: string, to?: string) {
  const inRange = (m: string) => (!from || m >= from) && (!to || m <= to);
  const months = Array.from(new Set(prod.map((p) => ym(p.period_month)))).filter(inRange);
  const buyers = Array.from(new Set(prod.map((p) => p.buyer)));
  const res = buyers.map((b) => ({ buyer: b, pieces: 0, tonnes: 0 }));
  for (const m of months) {
    const mp = prod.filter((p) => ym(p.period_month) === m);
    const total = mp.reduce((a, p) => a + p.pieces, 0);
    const kg = rows.filter((r) => ym(r.period_month) === m).reduce((a, r) => a + r.kg_co2e, 0);
    if (!total) continue;
    for (const p of mp) { const x = res.find((r) => r.buyer === p.buyer)!; x.pieces += p.pieces; x.tonnes += (kg * p.pieces) / total / 1000; }
  }
  return res.map((x) => ({ ...x, kgPerPiece: x.pieces ? (x.tonnes * 1000) / x.pieces : 0 })).sort((a, b) => b.tonnes - a.tonnes);
}

// ================= প্রত্যাশিত বনাম আসল =================
/** ছোট least-squares: y = b0 + b1·x1 (+ b2·x2) */
function fit(X: number[][], y: number[]) {
  const k = X[0].length + 1, A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let i = 0; i < y.length; i++) {
    const r = [1, ...X[i]];
    for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) A[a][b] += r[a] * r[b]; A[a][k] += r[a] * y[i]; }
  }
  for (let c = 0; c < k; c++) { // Gauss-Jordan
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-12) return null;
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let j = c; j <= k; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((row, i) => row[k] / A[i][i]);
}

export type Alert = {
  kind: "anomaly" | "generator"; severity: "high" | "medium"; month: string; activity: string;
  title: string; detail: string; actual: number; expected: number; pct: number; tkLoss: number; extraT: number;
};

/** প্রতিটা মাসকে বাকি মাসগুলো দিয়ে শেখা model থেকে অনুমান (leave-one-out) — অস্বাভাবিক মাস নিজের অনুমানকে বিকৃত করতে পারে না */
export function anomalies(rows: InRow[], prod: InProd[], threshold = 0.08): Alert[] {
  const piecesBy = new Map<string, number>();
  for (const p of prod) piecesBy.set(ym(p.period_month), (piecesBy.get(ym(p.period_month)) ?? 0) + p.pieces);
  const out: Alert[] = [];
  const spec = [
    { a: "electricity", unit: "kWh", price: ASSUME.gridTkPerKwh, x: (m: string) => [piecesBy.get(m)!, DHAKA_TEMP[parseInt(m.slice(5, 7), 10) - 1]], why: "উৎপাদন আর তাপমাত্রা দিয়ে ব্যাখ্যা হয় না — compressor, chiller বা লাইটিং দেখুন" },
    { a: "natural_gas", unit: "m³", price: ASSUME.gasTkPerM3, x: (m: string) => [piecesBy.get(m)!], why: "উৎপাদন দিয়ে ব্যাখ্যা হয় না — বয়লার, steam লিক বা condensate ফেরত দেখুন" },
  ];
  for (const s of spec) {
    const pts = rows.filter((r) => r.activity === s.a && piecesBy.has(ym(r.period_month))).map((r) => ({ m: ym(r.period_month), y: r.quantity, kg: r.kg_co2e }));
    if (pts.length < 6) continue;
    for (const p of pts) {
      const others = pts.filter((q) => q.m !== p.m);
      const b = fit(others.map((q) => s.x(q.m)), others.map((q) => q.y));
      if (!b) continue;
      const xs = s.x(p.m), expected = b[0] + xs.reduce((a, v, i) => a + v * b[i + 1], 0);
      const pct = (p.y - expected) / expected;
      if (pct > threshold) {
        const extra = p.y - expected;
        out.push({
          kind: "anomaly", severity: pct > 0.12 ? "high" : "medium", month: p.m, activity: s.a,
          title: `${monthBn(p.m)}: ${ACT[s.a]} প্রত্যাশার চেয়ে ${(pct * 100).toFixed(0)}% বেশি`,
          detail: s.why,
          actual: p.y, expected, pct, tkLoss: extra * s.price, extraT: (p.kg / p.y) * extra / 1000,
        });
      }
    }
  }
  return out.sort((a, b) => b.pct - a.pct);
}

/** ডিজেল জেনারেটর: grid-এর বদলে জেনারেটরে বিদ্যুৎ বানালে বাড়তি খরচ আর কার্বন */
export function generator(rows: InRow[], gridKgPerKwh = 0.696) {
  const d = rows.filter((r) => r.activity === "diesel").map((r) => {
    const kwh = r.quantity * ASSUME.gensetKwhPerL;
    const tkExtra = r.quantity * ASSUME.dieselTkPerL - kwh * ASSUME.gridTkPerKwh;
    const tExtra = (r.kg_co2e - kwh * gridKgPerKwh) / 1000;
    return { month: ym(r.period_month), litres: r.quantity, kwh, tkExtra, tExtra, t: r.kg_co2e / 1000 };
  }).sort((a, b) => a.month.localeCompare(b.month));
  const total = { litres: d.reduce((a, x) => a + x.litres, 0), tkExtra: d.reduce((a, x) => a + x.tkExtra, 0), tExtra: d.reduce((a, x) => a + x.tExtra, 0), t: d.reduce((a, x) => a + x.t, 0) };
  const peak = d.reduce((a, x) => (!a || x.litres > a.litres ? x : a), null as null | (typeof d)[number]);
  return { months: d, total, peak };
}
