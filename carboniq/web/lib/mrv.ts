// MRV (Measurement, Reporting & Verification): একটা প্রকল্পে আসলেই কত নির্গমন কমেছে।
// পদ্ধতি: IPMVP Option C-র ধারণা (পুরো কারখানার মাসিক বিল) —
//   (১) প্রকল্পের আগের মাসগুলো (baseline) দিয়ে model: ব্যবহার = b0 + b1·উৎপাদন (+ b2·তাপমাত্রা)
//   (২) প্রকল্পের পরের মাসে ওই model দিয়ে "প্রকল্প না করলে কত হতো" (adjusted baseline)
//   (৩) সাশ্রয় = adjusted baseline − আসল ব্যবহার
//   (৪) অনিশ্চয়তা: OLS-এর prediction variance থেকে (বানানো ± নয়), ৯০% t-বণ্টন
//   (৫) Model যথেষ্ট ভালো কিনা: ASHRAE Guideline 14-এর regression baseline মানদণ্ড (মাসিক তথ্য) — CV(RMSE) ≤ ২০%, |NMBE| ≤ ৫%
// সব জ্বালানি একসাথে দেখে leakage/rebound ধরে: এক জায়গায় কমে অন্য জায়গায় বাড়লে নিট কমানো।
import { DHAKA_TEMP } from "./demoModel";
import type { InProd, InRow } from "./insights";

export type MrvProject = { id: string; name: string; start: string; activities: string[]; capexTk?: number | null };

const ym = (d: string) => d.slice(0, 7);
const tempOf = (m: string) => DHAKA_TEMP[parseInt(m.slice(5, 7), 10) - 1];
const ACT_BN: Record<string, string> = { electricity: "বিদ্যুৎ", natural_gas: "গ্যাস", diesel: "ডিজেল", lpg: "LPG" };
const UNIT_BN: Record<string, string> = { electricity: "kWh", natural_gas: "m³", diesel: "লিটার", lpg: "লিটার" };

// ---------- ছোট linear algebra ----------
function inverse(M: number[][]): number[][] | null {
  const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}

/** দুই-দিকের ৯০% t মান (df = স্বাধীনতার মাত্রা) */
export function t90(df: number) {
  const T = [6.314, 2.92, 2.353, 2.132, 2.015, 1.943, 1.895, 1.86, 1.833, 1.812, 1.796, 1.782, 1.771, 1.761, 1.753, 1.746, 1.74, 1.734, 1.729, 1.725];
  return df < 1 ? Infinity : df <= 20 ? T[df - 1] : df <= 30 ? 1.70 : 1.645;
}

export type OlsFit = { beta: number[]; xtxInv: number[][]; sigma: number; df: number; r2: number; cvrmse: number; nmbe: number; n: number };

/** সাধারণ least squares — coefficient, residual σ, আর ASHRAE 14-এর fit মাপ */
export function ols(X: number[][], y: number[]): OlsFit | null {
  const n = y.length, k = X[0].length + 1;
  if (n <= k) return null;
  const Z = X.map((r) => [1, ...r]);
  const xtx = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => Z.reduce((s, r) => s + r[a] * r[b], 0)));
  const inv = inverse(xtx); if (!inv) return null;
  const xty = Array.from({ length: k }, (_, a) => Z.reduce((s, r, i) => s + r[a] * y[i], 0));
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j], 0));
  const pred = Z.map((r) => r.reduce((s, v, j) => s + v * beta[j], 0));
  const sse = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0), mean = y.reduce((a, b) => a + b, 0) / n;
  const sst = y.reduce((s, v) => s + (v - mean) ** 2, 0), df = n - k, sigma = Math.sqrt(sse / df);
  return { beta, xtxInv: inv, sigma, df, n, r2: sst ? 1 - sse / sst : 0, cvrmse: sigma / mean, nmbe: y.reduce((s, v, i) => s + (v - pred[i]), 0) / (df * mean) };
}

const predict = (f: OlsFit, x: number[]) => [1, ...x].reduce((s, v, j) => s + v * f.beta[j], 0);

/** কয়েক মাসের মোট অনুমানের ভ্যারিয়েন্স: σ²·(m + 1ᵀ X (XᵀX)⁻¹ Xᵀ 1) — প্রতি মাসের নতুন noise আর coefficient-এর অনিশ্চয়তা দুটোই */
function sumPredVar(f: OlsFit, xs: number[][]) {
  const s = xs.reduce((acc, x) => acc.map((v, j) => v + [1, ...x][j]), new Array(f.beta.length).fill(0));
  const quad = s.reduce((acc, si, a) => acc + si * f.xtxInv[a].reduce((t, v, b) => t + v * s[b], 0), 0);
  return f.sigma ** 2 * (xs.length + quad);
}

export type FuelResult = {
  activity: string; label: string; unit: string; inProject: boolean;
  modelOk: boolean; fit: { r2: number; cvrmse: number; nmbe: number; n: number; features: string[] } | null;
  months: { month: string; actual: number; expected: number; lo: number; hi: number }[];
  baseMonths: { month: string; actual: number; fitted: number }[];
  actualQty: number; expectedQty: number; savedQty: number; uQty: number;
  savedT: number; uT: number; significant: boolean; note: string;
};

export type MrvResult = {
  project: MrvProject; baseline: { from: string; to: string; months: number }; post: { from: string; to: string; months: number };
  fuels: FuelResult[];
  claimedT: number; claimedUT: number;           // শুধু প্রকল্পের জ্বালানিতে সাশ্রয়
  netT: number; netUT: number;                   // সব যাচাইযোগ্য জ্বালানি মিলিয়ে নিট
  leakage: { activity: string; label: string; extraT: number; text: string }[];
  unverifiable: string[];                        // যে জ্বালানির model ভালো নয় — নিট-এ ধরা হয়নি, সতর্কতা
  intensity: { baseKgPerPiece: number; postKgPerPiece: number; changePct: number; basePieces: number; postPieces: number; absChangePct: number };
  status: "verified-savings" | "not-significant" | "insufficient-data";
  verdict: string; preliminary: boolean; kgPerUnit: Record<string, number>;
};

/**
 * MRV হিসাব। rows = মাসিক record (সব জ্বালানি), prod = উৎপাদন।
 * baselineMonths: প্রকল্পের ঠিক আগের সর্বোচ্চ কত মাস baseline ধরা হবে (ডিফল্ট ১২)।
 */
export function mrv(project: MrvProject, rows: InRow[], prod: InProd[], baselineMonths = 12): MrvResult {
  const pieces = new Map<string, number>();
  for (const p of prod) pieces.set(ym(p.period_month), (pieces.get(ym(p.period_month)) ?? 0) + p.pieces);
  const months = Array.from(new Set(rows.map((r) => ym(r.period_month)))).filter((m) => pieces.has(m)).sort();
  const base = months.filter((m) => m < project.start).slice(-baselineMonths), post = months.filter((m) => m >= project.start);
  const acts = Array.from(new Set(rows.map((r) => r.activity)));
  const kgPerUnit: Record<string, number> = {};
  for (const a of acts) { const r = rows.find((x) => x.activity === a && x.quantity > 0); if (r) kgPerUnit[a] = r.kg_co2e / r.quantity; }

  const qty = (a: string, m: string) => rows.filter((r) => r.activity === a && ym(r.period_month) === m).reduce((s, r) => s + r.quantity, 0);
  const fuels: FuelResult[] = [];
  for (const a of acts) {
    const has = (m: string) => rows.some((r) => r.activity === a && ym(r.period_month) === m);
    const bm = base.filter(has), pm = post.filter(has);
    const inProject = project.activities.includes(a);
    const empty = { activity: a, label: ACT_BN[a] ?? a, unit: UNIT_BN[a] ?? "", inProject, months: [], baseMonths: [], actualQty: 0, expectedQty: 0, savedQty: 0, uQty: 0, savedT: 0, uT: 0, significant: false };
    if (bm.length < 6 || !pm.length) { fuels.push({ ...empty, modelOk: false, fit: null, note: `baseline-এ ${bm.length} মাস, পরে ${pm.length} মাস — model-এর জন্য যথেষ্ট নয় (কমপক্ষে ৬ + ১)` }); continue; }
    // বিদ্যুতে তাপমাত্রা (AC/chiller/ventilation), বাকিগুলোতে শুধু উৎপাদন — দুটোই চেষ্টা করে যেটা ASHRAE মানদণ্ডে ভালো
    const cands = [
      { features: ["উৎপাদন"], x: (m: string) => [pieces.get(m)!] },
      ...(bm.length >= 8 ? [{ features: ["উৎপাদন", "তাপমাত্রা"], x: (m: string) => [pieces.get(m)!, tempOf(m)] }] : []),
    ];
    let best: { f: OlsFit; c: (typeof cands)[number] } | null = null;
    for (const c of cands) {
      const f = ols(bm.map(c.x), bm.map((m) => qty(a, m)));
      if (f && (!best || f.cvrmse < best.f.cvrmse * 0.9)) best = { f, c }; // জটিল model শুধু স্পষ্টভাবে ভালো হলে
    }
    if (!best) { fuels.push({ ...empty, modelOk: false, fit: null, note: "model বসানো যায়নি" }); continue; }
    const { f, c } = best;
    const modelOk = f.cvrmse <= 0.2 && Math.abs(f.nmbe) <= 0.05;
    const tt = t90(f.df);
    const mm = pm.map((m) => { const e = predict(f, c.x(m)), u = tt * Math.sqrt(sumPredVar(f, [c.x(m)])); return { month: m, actual: qty(a, m), expected: e, lo: e - u, hi: e + u }; });
    const baseMonths = bm.map((m) => ({ month: m, actual: qty(a, m), fitted: predict(f, c.x(m)) }));
    const actualQty = mm.reduce((s, x) => s + x.actual, 0), expectedQty = mm.reduce((s, x) => s + x.expected, 0);
    const uQty = tt * Math.sqrt(sumPredVar(f, pm.map(c.x)));
    const k = (kgPerUnit[a] ?? 0) / 1000, savedQty = expectedQty - actualQty;
    fuels.push({
      ...empty, modelOk, months: mm, baseMonths, actualQty, expectedQty, savedQty, uQty, savedT: savedQty * k, uT: uQty * k,
      significant: modelOk && Math.abs(savedQty) > uQty,
      fit: { r2: f.r2, cvrmse: f.cvrmse, nmbe: f.nmbe, n: f.n, features: c.features },
      note: modelOk ? "" : `model দুর্বল (CV(RMSE) ${(f.cvrmse * 100).toFixed(0)}% > ২০%) — ${a === "diesel" ? "জেনারেটরের ব্যবহার load-shedding-এর উপর নির্ভর করে, উৎপাদন বা তাপমাত্রা দিয়ে ব্যাখ্যা হয় না" : "এই জ্বালানির সাশ্রয় নিশ্চিতভাবে বলা যায় না"}`,
    });
  }

  const ok = fuels.filter((x) => x.modelOk);
  const claimed = ok.filter((x) => x.inProject);
  const rss = (xs: FuelResult[]) => Math.sqrt(xs.reduce((s, x) => s + x.uT ** 2, 0)); // স্বাধীন অনিশ্চয়তা: বর্গের যোগফলের মূল
  const claimedT = claimed.reduce((s, x) => s + x.savedT, 0), netT = ok.reduce((s, x) => s + x.savedT, 0);
  const leakage = ok.filter((x) => !x.inProject && x.savedQty < 0 && Math.abs(x.savedQty) > x.uQty).map((x) => ({
    activity: x.activity, label: x.label, extraT: -x.savedT,
    text: `${x.label} প্রত্যাশার চেয়ে ${Math.round(-x.savedQty).toLocaleString()} ${x.unit} বেশি (${(-x.savedT).toFixed(1)} টন) — প্রকল্পের দাবি থেকে বাদ দিতে হবে, কারণ খুঁজুন`,
  }));
  const unverifiable = fuels.filter((x) => !x.modelOk).map((x) => `${x.label}: ${x.note}`);

  // প্রতি পিস বনাম মোট — উৎপাদন কমায় কমেছে নাকি দক্ষতা বেড়েছে
  const kgIn = (ms: string[]) => rows.filter((r) => ms.includes(ym(r.period_month))).reduce((s, r) => s + r.kg_co2e, 0);
  const pcs = (ms: string[]) => ms.reduce((s, m) => s + (pieces.get(m) ?? 0), 0);
  const bk = kgIn(base), pk = kgIn(post), bp = pcs(base), pp = pcs(post);
  const baseKgPerPiece = bp ? bk / bp : 0, postKgPerPiece = pp ? pk / pp : 0;
  const intensity = {
    baseKgPerPiece, postKgPerPiece, basePieces: bp, postPieces: pp,
    changePct: baseKgPerPiece && pp ? ((postKgPerPiece - baseKgPerPiece) / baseKgPerPiece) * 100 : 0,
    absChangePct: base.length && post.length ? ((pk / post.length - bk / base.length) / (bk / base.length)) * 100 : 0,
  };

  const cu = rss(claimed), nu = rss(ok);
  const status: MrvResult["status"] = !claimed.length ? "insufficient-data" : claimedT > cu ? "verified-savings" : "not-significant";
  const preliminary = post.length < 12 || base.length < 12;
  const verdict = !post.length
    ? `প্রকল্প শুরুর মাস (${project.start}) থেকে কোনো বিল নেই — প্রকল্পের পরের অন্তত ১ মাসের বিল upload করলে যাচাই হবে`
    : base.length < 6
      ? `প্রকল্পের আগে মাত্র ${base.length} মাসের বিল — baseline model-এর জন্য কমপক্ষে ৬ মাস লাগে`
      : status === "insufficient-data"
    ? "এই প্রকল্পের জ্বালানির জন্য নির্ভরযোগ্য baseline model নেই (ASHRAE 14 মানদণ্ড পূরণ হয়নি) — সাশ্রয় দাবি করা যায় না"
    : status === "verified-savings"
      ? `প্রকল্পের জ্বালানিতে ${claimedT.toFixed(1)} ± ${cu.toFixed(1)} টন CO₂e কমেছে (৯০% আস্থা)${leakage.length ? `; অন্য জ্বালানিতে বাড়তি ধরে নিট ${netT.toFixed(1)} ± ${nu.toFixed(1)} টন` : ""}`
      : `পরিমাপে ${claimedT.toFixed(1)} টন দেখা যাচ্ছে, কিন্তু অনিশ্চয়তা (±${cu.toFixed(1)}) এর চেয়ে বড় — পরিসংখ্যানগতভাবে নিশ্চিত নয়`;
  return {
    project, fuels, claimedT, claimedUT: cu, netT, netUT: nu, leakage, unverifiable, intensity, status, verdict, preliminary, kgPerUnit,
    baseline: { from: base[0] ?? "", to: base.at(-1) ?? "", months: base.length },
    post: { from: post[0] ?? "", to: post.at(-1) ?? "", months: post.length },
  };
}
