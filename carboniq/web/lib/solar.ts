// ছাদের solar: আঁকা এলাকা + সেই অবস্থানের সূর্যালোক (NASA POWER) → kWp, kWh, CO₂, সাশ্রয়।
// নিয়ম: প্রতিটা সংখ্যা হয় (ক) প্রকাশিত উৎস থেকে, নয় (খ) ব্যবহারকারীর দেওয়া মান — বানানো ডিফল্ট দাম/খরচ নেই।
import { FACTORS } from "./factors";

/** উৎসসহ ধ্রুবক */
export const SOLAR_SRC = {
  moduleWpPerM2: { v: 550 / (2.278 * 1.134), src: "প্রচলিত ৫৫০ W মডিউল, মাপ ২২৭৮ × ১১৩৪ mm (≈২.৫৮ m²) → প্রতি m² প্যানেলে ≈২১৩ W (প্রস্তুতকারকদের datasheet-এর সাধারণ মাপ)" },
  pvwattsLoss: { v: 0.14, src: "NREL PVWatts v8-এর ডিফল্ট system loss ১৪% (ধুলা, ছায়া, তার, mismatch ইত্যাদি)" },
  inverterEff: { v: 0.96, src: "NREL PVWatts v8-এর ডিফল্ট inverter দক্ষতা ৯৬%" },
  tariffTk: { v: 10.63, src: "BERC-এর নতুন গড় খুচরা বিদ্যুৎ মূল্য ৳১০.৬৩/kWh, ১ জুন ২০২৬ থেকে (UNB, ৩ জুন ২০২৬)" },
  savingUsd: { v: 0.061, src: "IEEFA (জুলাই ২০২৬, pv magazine-এ উদ্ধৃত): শিল্পের দিনের grid মূল্য $০.০৯৪/kWh বনাম ছাদের solar-এর LCOE $০.০২৮–০.০৩২ → প্রতি kWh ≈ $০.০৬১ সাশ্রয়" },
  ghiSrc: "NASA POWER climatology API — ওই অবস্থানের দীর্ঘমেয়াদি গড় all-sky সূর্যালোক (ALLSKY_SFC_SW_DWN)",
  notModeled: "প্যানেলের তাপজনিত ক্ষতি, কাত/দিক আর আশপাশের ভবনের ছায়া আলাদা করে মডেল করা হয়নি — বাংলাদেশের গরমে আসল উৎপাদন কয়েক শতাংশ কম হতে পারে",
};

/** ব্যবহারকারী-নির্ধারিত মান (ডিফল্ট শুধু শুরু করার জন্য; পাতায় বদলানো যায় ও স্পষ্ট লেখা থাকে) */
export type SolarUser = { usablePct: number; daytimePct: number; capexTkPerKwp: number | null };
export const SOLAR_USER_DEFAULT: SolarUser = { usablePct: 60, daytimePct: 60, capexTkPerKwp: null };

/** একটা কারখানার ছাদ সাধারণত কয়েক হাজার থেকে কয়েক দশ হাজার m² — এর চেয়ে বড় হলে সম্ভবত ভুল এলাকা */
export const MAX_ROOF_M2 = 60_000;

/** ছোট বহুভুজের ক্ষেত্রফল (m²): স্থানীয় সমতলে প্রক্ষেপ করে shoelace — কয়েকশো মিটারে ভুল নগণ্য */
export function polygonAreaM2(pts: { lat: number; lng: number }[]) {
  if (pts.length < 3) return 0;
  const lat0 = (pts.reduce((s, p) => s + p.lat, 0) / pts.length) * (Math.PI / 180);
  const xy = pts.map((p) => [p.lng * 111_320 * Math.cos(lat0), p.lat * 110_574]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) { const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]; a += x1 * y2 - x2 * y1; }
  return Math.abs(a) / 2;
}

export function pvEstimate(areaM2: number, ghiDaily: number, annualGridKwh: number, u: SolarUser = SOLAR_USER_DEFAULT) {
  const panelM2 = areaM2 * (u.usablePct / 100);
  const fitKwp = (panelM2 * SOLAR_SRC.moduleWpPerM2.v) / 1000;
  const perf = (1 - SOLAR_SRC.pvwattsLoss.v) * SOLAR_SRC.inverterEff.v;          // ≈ ০.৮২৬
  const yieldKwhPerKwp = ghiDaily * 365 * perf;                                     // kWh/kWp/বছর
  const loadKwp = yieldKwhPerKwp ? (annualGridKwh * (u.daytimePct / 100)) / yieldKwhPerKwp : fitKwp;
  const kwp = Math.min(fitKwp, loadKwp);                                            // ছাদে যতটা ধরে আর দিনের চাহিদায় যতটা লাগে — ছোটটা
  const kwhYr = kwp * yieldKwhPerKwp;
  const grid = FACTORS.find((f) => f.activity === "electricity")!.kgPerUnit;
  const tYr = (kwhYr * grid) / 1000;
  const gridBillTk = kwhYr * SOLAR_SRC.tariffTk.v;                                  // grid থেকে এই বিদ্যুৎ কিনলে কত লাগত
  const savingUsd = kwhYr * SOLAR_SRC.savingUsd.v;                                  // IEEFA-র প্রতি kWh নিট সাশ্রয়
  const capex = u.capexTkPerKwp ? kwp * u.capexTkPerKwp : null;
  const payback = capex ? capex / gridBillTk : null;                                // সরল payback (রক্ষণাবেক্ষণ বাদে)
  return { panelM2, fitKwp, kwp, limitedByLoad: loadKwp < fitKwp, perf, yieldKwhPerKwp, kwhYr, used: kwhYr, tYr, gridBillTk, savingUsd, capex, payback, shareOfGrid: annualGridKwh ? kwhYr / annualGridKwh : 0 };
}

/** NASA POWER climatology উত্তর থেকে বার্ষিক গড় (kWh/m²/দিন) আর মাসিক মান */
export function parsePower(j: any): { ann: number; monthly: number[] } | null {
  const p = j?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
  if (!p || typeof p.ANN !== "number" || p.ANN <= 0) return null;
  const keys = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return { ann: p.ANN, monthly: keys.map((k) => Number(p[k])) };
}
