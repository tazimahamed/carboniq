// ছাদের solar: satellite মানচিত্রে আঁকা ছাদ + সেই অবস্থানের সূর্যালোক (NASA POWER) → kWp, kWh, CO₂, ৳
// সব অনুমান এখানে লেখা; ফল "প্রাথমিক অনুমান — site survey দরকার"।
import { ASSUME } from "./assumptions";
import { FACTORS } from "./factors";

export const SOLAR_ASSUME = {
  usable: 0.7,        // ছাদের ৭০% ব্যবহারযোগ্য (হাঁটার পথ, ছায়া, যন্ত্রপাতি বাদে)
  kwpPerM2: 0.2,      // আধুনিক ~২১% দক্ষ প্যানেল ≈ ২০০ W/m²
  pr: 0.78,           // Performance ratio: তাপ, ধুলা, inverter ও তারের loss মিলিয়ে সাধারণ মান ০.৭৫–০.৮০
  capexTkPerKwp: 45_000, // Planner-এর solar অনুমানের সাথে একই (৳১.৩৫ কোটি / ৩০০ kWp)
  selfUseCap: 0.6,    // দিনের লোডের বেশি ধরা হয় না (রাতে উৎপাদন নেই, export ধরা হয়নি)
  fallbackGhi: 4.6,   // NASA না পাওয়া গেলে: বাংলাদেশের মোটামুটি গড় দৈনিক সূর্যালোক (kWh/m²/দিন) — "অফলাইন অনুমান" লেবেলসহ
  note: "ছাদের ৭০% ব্যবহারযোগ্য, ০.২ kWp/m², performance ratio ০.৭৮, ৳৪৫,০০০/kWp, দিনের লোডের ৬০% পর্যন্ত নিজে ব্যবহার",
};

/** ছোট বহুভুজের ক্ষেত্রফল (m²): স্থানীয় সমতলে প্রক্ষেপ করে shoelace — কয়েকশো মিটারে ভুল নগণ্য */
export function polygonAreaM2(pts: { lat: number; lng: number }[]) {
  if (pts.length < 3) return 0;
  const lat0 = (pts.reduce((s, p) => s + p.lat, 0) / pts.length) * (Math.PI / 180);
  const xy = pts.map((p) => [p.lng * 111_320 * Math.cos(lat0), p.lat * 110_574]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) { const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]; a += x1 * y2 - x2 * y1; }
  return Math.abs(a) / 2;
}

/** একটা কারখানার ছাদ সাধারণত কয়েক হাজার থেকে কয়েক দশ হাজার m² — এর চেয়ে বড় হলে সম্ভবত ভুল এলাকা আঁকা হয়েছে */
export const MAX_ROOF_M2 = 60_000;

export function pvEstimate(areaM2: number, ghiDaily: number, annualGridKwh: number) {
  const fitKwp = areaM2 * SOLAR_ASSUME.usable * SOLAR_ASSUME.kwpPerM2;   // ছাদে যতটা ধরে
  const yieldKwhPerKwp = ghiDaily * 365 * SOLAR_ASSUME.pr;     // kWh/kWp/বছর
  // প্রস্তাবিত আকার: ছাদে যতটা ধরে আর নিজের দিনের লোডে যতটা কাজে লাগে — দুটোর ছোটটা (বাড়তি প্যানেলে টাকা নষ্ট)
  const loadKwp = yieldKwhPerKwp ? (annualGridKwh * SOLAR_ASSUME.selfUseCap) / yieldKwhPerKwp : fitKwp;
  const kwp = Math.min(fitKwp, loadKwp);
  const kwhYr = kwp * yieldKwhPerKwp;
  const used = Math.min(kwhYr, annualGridKwh * SOLAR_ASSUME.selfUseCap);
  const grid = FACTORS.find((f) => f.activity === "electricity")!.kgPerUnit;
  const tYr = (used * grid) / 1000, tkYr = used * ASSUME.gridTkPerKwh, capex = kwp * SOLAR_ASSUME.capexTkPerKwp;
  return { kwp, fitKwp, limitedByLoad: loadKwp < fitKwp, yieldKwhPerKwp, kwhYr, used, capped: used < kwhYr - 1e-6, tYr, tkYr, capex, payback: tkYr ? capex / tkYr : Infinity, shareOfGrid: annualGridKwh ? used / annualGridKwh : 0 };
}

/** NASA POWER climatology উত্তর থেকে বার্ষিক গড় (kWh/m²/দিন) আর মাসিক মান */
export function parsePower(j: any): { ann: number; monthly: number[] } | null {
  const p = j?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
  if (!p || typeof p.ANN !== "number" || p.ANN <= 0) return null;
  const keys = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return { ann: p.ANN, monthly: keys.map((k) => Number(p[k])) };
}
