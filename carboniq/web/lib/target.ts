// Buyer-এর লক্ষ্য: "baseline-এর তুলনায় প্রতি পিসে X% কমানো" — বর্তমান ধারায় লক্ষ্য মিসের ঝুঁকি কতটা।
// প্রতি পিসের মাসিক নির্গমনে সরল রৈখিক ধারা (least squares) + ৯০% prediction interval; তথ্য কম, তাই "ঝুঁকি" বলা হয়, নিশ্চয়তা নয়।
import { ols, t90 } from "./mrv";
import type { Intensity } from "./insights";

export type TargetResult = {
  baseline: number; target: number; current: number; projected: number; lo: number; hi: number; withPlan: number;
  monthsAhead: number; risk: "কম" | "মাঝারি" | "বেশি" | "অনিশ্চিত"; text: string; slopePctPerMonth: number;
};

export function targetRisk(series: Intensity[], reductionPct: number, targetMonth: string, planCutPct = 0): TargetResult | null {
  if (series.length < 6) return null;
  const ys = series.map((s) => s.kgPerPiece);
  const base = ys.slice(0, 3).reduce((a, b) => a + b, 0) / 3; // প্রথম ৩ মাস = baseline
  const target = base * (1 - reductionPct / 100);
  const current = ys.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const f = ols(ys.map((_, i) => [i]), ys); if (!f) return null;
  const last = series.at(-1)!.month, [ly, lm] = last.split("-").map(Number), [ty, tm] = targetMonth.split("-").map(Number);
  const ahead = (ty - ly) * 12 + (tm - lm), xi = ys.length - 1 + ahead;
  const proj = f.beta[0] + f.beta[1] * xi;
  const z = [1, xi], v = z.reduce((s, a, i) => s + a * f.xtxInv[i].reduce((t, b, j) => t + b * z[j], 0), 0);
  const u = t90(f.df) * f.sigma * Math.sqrt(1 + v);
  const withPlan = proj * (1 - planCutPct / 100);
  const risk: TargetResult["risk"] = ahead <= 0 ? "অনিশ্চিত" : proj - u > target ? "বেশি" : proj + u <= target ? "কম" : "মাঝারি";
  const text = risk === "বেশি" ? "বর্তমান ধারায় লক্ষ্য মিসের ঝুঁকি বেশি — সম্ভাব্য সীমার নিচের প্রান্তও লক্ষ্যের উপরে"
    : risk === "কম" ? "বর্তমান ধারায় লক্ষ্য পূরণের সম্ভাবনা ভালো — সম্ভাব্য সীমার উপরের প্রান্তও লক্ষ্যের নিচে"
    : risk === "মাঝারি" ? "লক্ষ্য সম্ভাব্য সীমার ভেতরে — ধারা বদলালে মিস হতে পারে" : "লক্ষ্যের মাস ভবিষ্যতে দিন";
  return { baseline: base, target, current, projected: proj, lo: proj - u, hi: proj + u, withPlan, monthsAhead: ahead, risk, text, slopePctPerMonth: (f.beta[1] / base) * 100 };
}
