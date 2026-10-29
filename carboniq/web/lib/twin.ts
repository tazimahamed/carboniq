// Energy Twin: কারখানার মাসিক বিল থেকে শেখা "ভার্চুয়াল কারখানা" — what-if প্রশ্নের উত্তর অনিশ্চয়তাসহ।
// সম্পর্কগুলো আসল তথ্যে বসানো (least squares); zone-ভাগ শিল্প-অনুমান, স্পষ্ট লেবেলসহ।
import { DHAKA_TEMP } from "./demoModel";
import { ols, t90, type OlsFit } from "./mrv";
import type { InProd, InRow } from "./insights";
import { ASSUME } from "./assumptions";
import { FACTORS } from "./factors";
import { PROJECTS, evaluate } from "./planner";

const ym = (d: string) => d.slice(0, 7);
const kgf = (a: string) => FACTORS.find((f) => f.activity === a)!.kgPerUnit;

/** ধরে নেওয়া: কারখানা মাসে ২৬ দিন, দিনে ২০ ঘণ্টা চলে; জেনারেটর লোডের ৬০% চালায় (জরুরি লাইন) */
export const TWIN_ASSUME = { days: 26, hoursPerDay: 20, genShare: 0.6, note: "মাসে ২৬ দিন × দিনে ২০ ঘণ্টা চালু; load-shedding-এ জেনারেটর লোডের ৬০% চালায়; জেনারেটর ৩.৩ kWh/লিটার" };

/** Knit composite কারখানার বিদ্যুৎ-ব্যবহারের আনুমানিক ভাগ (শিল্প-অনুমান — sub-meter দিলে আসল হবে) */
export const ZONES = [
  { id: "knit", name: "Knitting", elec: 0.2, gas: 0 },
  { id: "dye", name: "Dyeing ও finishing", elec: 0.22, gas: 1 },
  { id: "cut", name: "Cutting", elec: 0.05, gas: 0 },
  { id: "sew", name: "Sewing", elec: 0.25, gas: 0 },
  { id: "util", name: "Compressor, AC ও আলো", elec: 0.28, gas: 0 },
] as const;

export type TwinModel = {
  elec: { f: OlsFit; feat: "pt" | "p" } | null; gas: { f: OlsFit } | null;
  avg: { pieces: number; kwh: number; gas: number; diesel: number; temp: number; outageH: number };
  backtest: { activity: string; mape: number; n: number }[];
};

function fitElec(xs: { p: number; t: number }[], y: number[]) {
  const pt = ols(xs.map((x) => [x.p, x.t]), y), p = ols(xs.map((x) => [x.p]), y);
  if (pt && (!p || pt.cvrmse < p.cvrmse * 0.9)) return { f: pt, feat: "pt" as const };
  return p ? { f: p, feat: "p" as const } : null;
}

/** Diesel থেকে মাসে দিনে গড়ে কত ঘণ্টা load-shedding ছিল তার অনুমান (উল্টো হিসাব) */
export function impliedOutage(dieselL: number, gridKwh: number) {
  const loadKw = gridKwh / (TWIN_ASSUME.days * TWIN_ASSUME.hoursPerDay);
  return loadKw > 0 ? (dieselL * ASSUME.gensetKwhPerL) / (TWIN_ASSUME.genShare * loadKw * TWIN_ASSUME.days) : 0;
}

export function buildTwin(rows: InRow[], prod: InProd[]): TwinModel {
  const pieces = new Map<string, number>();
  for (const p of prod) pieces.set(ym(p.period_month), (pieces.get(ym(p.period_month)) ?? 0) + p.pieces);
  const q = (a: string, m: string) => rows.filter((r) => r.activity === a && ym(r.period_month) === m).reduce((s, r) => s + r.quantity, 0);
  const months = Array.from(new Set(rows.map((r) => ym(r.period_month)))).filter((m) => pieces.has(m)).sort().slice(-12);
  const temp = (m: string) => DHAKA_TEMP[parseInt(m.slice(5, 7), 10) - 1];
  const em = months.filter((m) => q("electricity", m) > 0), gm = months.filter((m) => q("natural_gas", m) > 0);
  const elec = em.length >= 6 ? fitElec(em.map((m) => ({ p: pieces.get(m)!, t: temp(m) })), em.map((m) => q("electricity", m))) : null;
  const gf = gm.length >= 5 ? ols(gm.map((m) => [pieces.get(m)!]), gm.map((m) => q("natural_gas", m))) : null;
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const avg = {
    pieces: mean(months.map((m) => pieces.get(m)!)), kwh: mean(em.map((m) => q("electricity", m))), gas: mean(gm.map((m) => q("natural_gas", m))),
    diesel: mean(months.map((m) => q("diesel", m))), temp: mean(months.map(temp)),
    outageH: mean(months.map((m) => impliedOutage(q("diesel", m), q("electricity", m)))),
  };
  // Backtest: প্রতিটা মাস বাদ দিয়ে বাকিগুলো দিয়ে শিখে সেই মাস অনুমান (leave-one-out) — twin কতটা নির্ভুল
  const loo = (ms: string[], fitFn: (train: string[]) => ((m: string) => number) | null, a: string) => {
    const errs: number[] = [];
    for (const m of ms) { const pr = fitFn(ms.filter((x) => x !== m)); if (pr) errs.push(Math.abs(pr(m) - q(a, m)) / q(a, m)); }
    return { activity: a, mape: errs.length ? (mean(errs) * 100) : NaN, n: errs.length };
  };
  const backtest = [
    loo(em, (tr) => { const e = fitElec(tr.map((m) => ({ p: pieces.get(m)!, t: temp(m) })), tr.map((m) => q("electricity", m))); return e ? (m) => e.f.beta[0] + e.f.beta[1] * pieces.get(m)! + (e.feat === "pt" ? e.f.beta[2] * temp(m) : 0) : null; }, "electricity"),
    loo(gm, (tr) => { const f = ols(tr.map((m) => [pieces.get(m)!]), tr.map((m) => q("natural_gas", m))); return f ? (m) => f.beta[0] + f.beta[1] * pieces.get(m)! : null; }, "natural_gas"),
  ];
  return { elec, gas: gf ? { f: gf } : null, avg, backtest };
}

export type TwinInput = { pieces: number; temp: number; outageH: number; gridChangePct: number; projects: string[] };

const predInterval = (f: OlsFit, x: number[]) => {
  const z = [1, ...x], v = z.reduce((s, a, i) => s + a * f.xtxInv[i].reduce((t, b, j) => t + b * z[j], 0), 0);
  return t90(f.df) * f.sigma * Math.sqrt(1 + v);
};

/** একটা মাসের অনুমান — প্রকল্পের শতাংশ সাশ্রয় planner-এর একই নিয়মে (গুণফলে), solar বাদ (বছরভিত্তিক) */
export function simulate(t: TwinModel, inp: TwinInput) {
  if (!t.elec) return null;
  const xe = t.elec.feat === "pt" ? [inp.pieces, inp.temp] : [inp.pieces];
  const kwh0 = t.elec.f.beta.reduce((s, b, i) => s + b * [1, ...xe][i], 0), ukwh = predInterval(t.elec.f, xe);
  const gas0 = t.gas ? t.gas.f.beta[0] + t.gas.f.beta[1] * inp.pieces : t.avg.gas, ugas = t.gas ? predInterval(t.gas.f, [inp.pieces]) : 0;
  const sel = PROJECTS.filter((p) => inp.projects.includes(p.id) && !p.solarKwhYr);
  const keep = (k: "elecPct" | "gasPct" | "dieselPct") => sel.reduce((a, p) => a * (1 - (p[k] ?? 0)), 1);
  const solar = PROJECTS.find((p) => p.id === "solar" && inp.projects.includes(p.id));
  const solarMonth = solar ? Math.min((solar.solarKwhYr ?? 0) / 12, kwh0 * keep("elecPct") * 0.6) : 0;
  const kwh = kwh0 * keep("elecPct") - solarMonth, gas = gas0 * keep("gasPct");
  const loadKw = kwh0 / (TWIN_ASSUME.days * TWIN_ASSUME.hoursPerDay);
  const diesel = (inp.outageH * TWIN_ASSUME.days * TWIN_ASSUME.genShare * loadKw) / ASSUME.gensetKwhPerL * keep("dieselPct");
  const gridF = kgf("electricity") * (1 + inp.gridChangePct / 100);
  const tE = (kwh * gridF) / 1000, tG = (gas * kgf("natural_gas")) / 1000, tD = (diesel * kgf("diesel")) / 1000;
  const total = tE + tG + tD, u = Math.sqrt(((ukwh * keep("elecPct") * gridF) / 1000) ** 2 + ((ugas * keep("gasPct") * kgf("natural_gas")) / 1000) ** 2);
  const tk = kwh * ASSUME.gridTkPerKwh + gas * ASSUME.gasTkPerM3 + diesel * ASSUME.dieselTkPerL;
  const zones = ZONES.map((z) => ({ ...z, t: z.elec * tE + z.gas * tG }));
  zones.push({ id: "gen", name: "জেনারেটর", elec: 0, gas: 0, t: tD } as never);
  return { kwh, gas, diesel, tE, tG, tD, total, u, tk, kgPerPiece: inp.pieces ? (total * 1000) / inp.pieces : 0, zones, solarMonth };
}

/** Planner-এর একই প্রকল্প তালিকা (twin-এ টগল করা যায়) */
export const TWIN_PROJECTS = PROJECTS.map((p) => ({ id: p.id, name: p.name }));
export { evaluate };
