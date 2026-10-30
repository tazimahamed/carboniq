// Decarbonization planner: বাজেটের মধ্যে কোন প্রকল্পগুলো একসাথে করলে সবচেয়ে বেশি কার্বন বা টাকা বাঁচে।
// প্রকল্পের খরচ আর কারখানা-স্তরের সাশ্রয় অনুমান (প্রতিটার basis লেখা); যেখানে প্রকল্প-স্তরের প্রকাশিত উৎস আছে সেটা src-এ। পাতায় সব বদলানো যায়।
import { ASSUME } from "./assumptions";
import { FACTORS } from "./factors";

export type Project = {
  id: string; name: string; what: string;
  capexTk: number; lifeYears: number;
  elecPct?: number;   // বিদ্যুৎ ব্যবহারের কত অংশ কমায় (০-১)
  gasPct?: number;
  dieselPct?: number;
  solarKwhYr?: number; // নিজস্ব বিদ্যুৎ উৎপাদন (kWh/বছর)
  src?: string;        // মাপা সাশ্রয়ের প্রকাশিত উৎস (প্রকল্প-স্তরে)
  basis: string;       // কারখানার মোট ব্যবহারের % কীভাবে ধরা — বেশিরভাগই অনুমান, পাতায় বদলানো যায়
};

export const PROJECTS: Project[] = [
  { id: "led", name: "LED আলো", what: "পুরনো tube light বদলে LED", capexTk: 1_200_000, lifeYears: 8, elecPct: 0.05, basis: "আলো যদি কারখানার বিদ্যুতের ~১০% হয় আর LED তার অর্ধেক বাঁচায় — দুটোই অনুমান; আপনার audit-এর মান দিন" },
  { id: "air", name: "Compressed air লিক মেরামত", what: "লিক খুঁজে মেরামত, চাপ কমানো", capexTk: 300_000, lifeYears: 3, elecPct: 0.04, src: "US DOE Compressed Air Tip Sheet #3 (2004): সাধারণ কারখানায় লিকে compressor-এর উৎপাদনের ২০–৩০% নষ্ট হয়; লক্ষ্য ৫–১০%", basis: "Compressor যদি বিদ্যুতের ~২০% হয় আর লিক ২৫% থেকে ১০%-এ নামে → ≈৪% (compressor-এর ভাগ অনুমান)" },
  { id: "servo", name: "Sewing machine-এ servo motor", what: "clutch motor বদলে servo", capexTk: 2_500_000, lifeYears: 8, elecPct: 0.06, src: "Tekstilna industrija (জানুয়ারি ২০২৩), \"Energy saving motors for sewing machines\": servo motor clutch motor-এর চেয়ে সর্বোচ্চ ৭০% কম বিদ্যুৎ খরচ করে", basis: "Sewing motor যদি বিদ্যুতের ~১০% হয় আর সাশ্রয় ৬০% → ≈৬% (ভাগ অনুমান)" },
  { id: "vfd", name: "Motor ও compressor-এ VFD", what: "চাহিদা অনুযায়ী গতি নিয়ন্ত্রণ", capexTk: 1_800_000, lifeYears: 10, elecPct: 0.05, src: "Pump/fan-এর affinity law (পদার্থবিদ্যা): শক্তি ∝ গতি³ — ২০% কম গতিতে ≈৪৯% কম শক্তি", basis: "Variable-load pump/fan যদি বিদ্যুতের ~১০–১৫% হয় → ≈৫% (ভাগ ও গতি অনুমান)" },
  { id: "hvac", name: "AC ও chiller setpoint", what: "তাপমাত্রা সেটিং আর রক্ষণাবেক্ষণ", capexTk: 400_000, lifeYears: 5, elecPct: 0.03, basis: "অনুমান — যাচাইকৃত উৎস পাওয়া যায়নি; আপনার audit-এর মান দিন" },
  { id: "solar", name: "ছাদে solar (৩০০ kWp)", what: "নিজস্ব বিদ্যুৎ, দিনের লোড", capexTk: 13_500_000, lifeYears: 20, solarKwhYr: 300 * 1350, basis: "আকার, ফলন ও খরচ অনুমান — Geo-তে আপনার ছাদ এঁকে আর quotation দিয়ে আসল মান বসান" },
  { id: "econ", name: "বয়লার economizer ও condensate ফেরত", what: "flue gas-এর তাপ আর গরম পানি ফেরত", capexTk: 1_500_000, lifeYears: 10, gasPct: 0.08, src: "US DOE Steam Tip Sheet: flue gas-এর তাপমাত্রা প্রতি ৪০°F (≈২২°C) কমালে বয়লারের দক্ষতা ≈১% বাড়ে", basis: "Economizer flue gas ~১৫০°C কমালে ≈৫–৭% + condensate ফেরত — মোট ৮% অনুমান" },
  { id: "steam", name: "Steam line insulation ও trap", what: "তাপ নষ্ট আর লিক বন্ধ", capexTk: 600_000, lifeYears: 6, gasPct: 0.05, basis: "অনুমান — steam trap survey-এর ফল দিয়ে বদলান" },
  { id: "ips", name: "জরুরি লোডের জন্য battery backup", what: "ছোট load-shedding-এ জেনারেটর না চালানো", capexTk: 2_000_000, lifeYears: 7, dieselPct: 0.35, basis: "অনুমান — কত ঘণ্টার load-shedding battery-তে চলবে তার উপর নির্ভর" },
  { id: "meter", name: "Sub-metering ও মাসিক নজরদারি", what: "কোন লাইনে কত খরচ, তা দেখে ব্যবস্থা", capexTk: 800_000, lifeYears: 8, elecPct: 0.02, gasPct: 0.02, basis: "অনুমান — যাচাইকৃত উৎস পাওয়া যায়নি" },
];

export type Baseline = { kwh: number; gasM3: number; dieselL: number };

const f = (a: string) => FACTORS.find((x) => x.activity === a)!.kgPerUnit;

/** একসাথে বাছা প্রকল্পের মোট প্রভাব — শতাংশ সাশ্রয় গুণফলে যোগ হয় (দ্বিগুণ গোনা এড়াতে), solar বাকি grid বিদ্যুৎ থেকে কমে */
export type Evaluation = { capex: number; tkYr: number; tYr: number; npv: number; tLife: number; kwhSaved: number; gasSaved: number; dieselSaved: number; paybackYears: number };

export function evaluate(sel: Project[], base: Baseline): Evaluation {
  const keep = (k: "elecPct" | "gasPct" | "dieselPct") => sel.reduce((a, p) => a * (1 - (p[k] ?? 0)), 1);
  const kwhAfterEff = base.kwh * keep("elecPct");
  const solar = Math.min(kwhAfterEff * 0.6, sel.reduce((a, p) => a + (p.solarKwhYr ?? 0), 0)); // দিনের লোডের বেশি ধরি না
  const kwhSaved = base.kwh - (kwhAfterEff - solar);
  const gasSaved = base.gasM3 * (1 - keep("gasPct"));
  const dieselSaved = base.dieselL * (1 - keep("dieselPct"));
  const tkYr = kwhSaved * ASSUME.gridTkPerKwh + gasSaved * ASSUME.gasTkPerM3 + dieselSaved * ASSUME.dieselTkPerL;
  const tYr = (kwhSaved * f("electricity") + gasSaved * f("natural_gas") + dieselSaved * f("diesel")) / 1000;
  const capex = sel.reduce((a, p) => a + p.capexTk, 0);
  // পুরো আয়ুষ্কালের নিট লাভ (NPV, ১০% discount): একসাথে করলে সাশ্রয় একটু কমে, তাই প্রতিটা প্রকল্পের একক সাশ্রয় অনুপাতে ছোট করে ধরা হয়
  const solo = sel.map((p) => ({ p, tk: sel.length === 1 ? tkYr : evaluate([p], base).tkYr }));
  const soloSum = solo.reduce((a, x) => a + x.tk, 0) || 1;
  const npv = solo.reduce((a, x) => a + x.tk * (tkYr / soloSum) * annuity(x.p.lifeYears), 0) - capex;
  const tLife = solo.reduce((a, x) => a + (x.tk / soloSum) * tYr * x.p.lifeYears, 0);
  return { capex, tkYr, tYr, npv, tLife, kwhSaved, gasSaved, dieselSaved, paybackYears: tkYr > 0 ? capex / tkYr : Infinity };
}

export const DISCOUNT = 0.10;
export const annuity = (years: number, r = DISCOUNT) => (1 - Math.pow(1 + r, -years)) / r;

/** প্রতিটা প্রকল্প একা: MACC-এর জন্য — প্রতি টন কমাতে বছরে নিট কত টাকা (ঋণাত্মক = লাভ) */
export function macc(base: Baseline) {
  return PROJECTS.map((p) => {
    const e = evaluate([p], base);
    const annualCost = p.capexTk / p.lifeYears - e.tkYr;
    return { ...p, ...e, tkPerT: e.tYr > 0 ? annualCost / e.tYr : Infinity };
  }).sort((a, b) => a.tkPerT - b.tkPerT);
}

/** সব সমন্বয় পরীক্ষা (২^১০ = ১০২৪) — বাজেটের মধ্যে সর্বোচ্চ লক্ষ্য; ছোট সমস্যা তাই নিশ্চিত সর্বোত্তম ফল */
export function optimize(base: Baseline, budgetTk: number, goal: "carbon" | "money" = "carbon"): Evaluation & { ids: string[] } {
  let best = { mask: 0, score: goal === "carbon" ? -1 : 0, res: evaluate([], base) };
  const n = PROJECTS.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const sel = PROJECTS.filter((_, i) => mask & (1 << i));
    const r = evaluate(sel, base);
    if (r.capex > budgetTk) continue;
    // সমান হলে কম খরচেরটা
    // কার্বন: বছরে সবচেয়ে বেশি টন কমানো; টাকা: আয়ুষ্কালে সবচেয়ে বেশি নিট লাভ (NPV) — শুধু বার্ষিক সাশ্রয় নয়
    const score = (goal === "carbon" ? r.tYr : r.npv) - r.capex * 1e-12;
    if (score > best.score) best = { mask, score, res: r };
  }
  return { ids: PROJECTS.filter((_, i) => best.mask & (1 << i)).map((p) => p.id), ...best.res };
}
