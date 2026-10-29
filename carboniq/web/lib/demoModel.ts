// Demo factory-র synthetic ডেটার মডেল — বাস্তবসম্মত সম্পর্ক রেখে বানানো, যাতে insight আর planner অর্থবহ হয়।
// সব সংখ্যা synthetic; UI-তে DEMO চিহ্ন থাকে।

/** ঢাকার মাসিক গড় তাপমাত্রা (°C), আনুমানিক climatology — জানুয়ারি থেকে ডিসেম্বর */
export const DHAKA_TEMP = [19, 22, 26, 28.5, 29, 29, 29, 29, 28.5, 27, 23.5, 20];

export const BUYERS = [
  { name: "Nordic Apparel", share: 0.45 },
  { name: "UrbanWear EU", share: 0.35 },
  { name: "Coastline US", share: 0.2 },
]; // কাল্পনিক buyer

const ORDER_SEASON = [0.9, 0.85, 0.95, 1.0, 1.05, 1.1, 1.0, 0.95, 1.05, 1.1, 1.05, 1.0]; // নভে → অক্টো
const DIESEL_L = [800, 600, 700, 900, 1800, 3200, 3600, 3400, 2600, 1500, 1000, 800]; // load-shedding গ্রীষ্মে বেশি

export type DemoMonth = { month: string; pieces: number; kwh: number; gas: number; diesel: number; temp: number };

export function demoMonths(): DemoMonth[] {
  const out: DemoMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(2025, 10 + i, 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const temp = DHAKA_TEMP[d.getUTCMonth()];
    const noise = 1 + 0.02 * Math.sin(i * 2.3);               // নির্দিষ্ট (deterministic) ছোট ওঠানামা
    const pieces = Math.round((250000 * ORDER_SEASON[i]) / 100) * 100;
    const kwh = Math.round((30000 + 0.28 * pieces + 1800 * (temp - 20)) * noise / 10) * 10;
    let gas = Math.round((8000 + 0.13 * pieces) * (2 - noise) / 10) * 10;
    if (month === "2026-08") gas = Math.round(gas * 1.16 / 10) * 10; // ইচ্ছাকৃত অস্বাভাবিকতা: বয়লারে সমস্যা (demo)
    out.push({ month, pieces, kwh, gas, diesel: DIESEL_L[i], temp });
  }
  return out;
}
