// ঝুঁকি আর অনিশ্চয়তা: কোন record বা passport আগে audit করা উচিত, আর মোট নির্গমনের সম্ভাব্য সীমা কত।
// প্রতিটা নিয়ম স্পষ্ট ও ব্যাখ্যাযোগ্য — "কালো বাক্স" score নয়। এটা audit-এর অগ্রাধিকার, প্রতারণার প্রমাণ নয়।
import { anomalies, type InProd } from "./insights";
import { foldEvidence, ledgerToRows, meterOk } from "./passportRows";

type Entry = { payload: Record<string, any> };
export type RiskFlag = { key: string; points: number; text: string };
export type RecordRisk = { record_id: string; month: string; activity: string; quantity: number; kg: number; score: number; level: "কম" | "মাঝারি" | "বেশি"; flags: RiskFlag[] };

export const RISK_RULES = {
  noBill: 30, meterMismatch: 25, billMismatch: 35, edited: 15, lowOcr: 10, round: 10, future: 40, anomaly: 20,
} as const;

const level = (s: number): RecordRisk["level"] => (s >= 50 ? "বেশি" : s >= 25 ? "মাঝারি" : "কম");

/** প্রতিটা record-এর ঝুঁকি, কারণসহ */
export function recordRisks(entries: Entry[], prod: InProd[], nowMonth: string): RecordRisk[] {
  const recs = foldEvidence(entries);
  const alerts = anomalies(ledgerToRows(entries), prod);
  return recs.map((e) => {
    const p = e.payload, m = String(p.period_month).slice(0, 7), flags: RiskFlag[] = [];
    const add = (key: keyof typeof RISK_RULES, text: string) => flags.push({ key, points: RISK_RULES[key], text });
    const ev = p.evidence;
    if (!ev) add("noBill", "মূল বিল সংযুক্ত নেই — শুধু হাতে লেখা বা demo তথ্য");
    else {
      if (p.bill_check?.ok === false) add("billMismatch", `বিলের সংখ্যা record থেকে ${p.bill_check.diff_pct}% আলাদা`);
      else if (meterOk(p) === false) add("meterMismatch", "মিটার রিডিং থেকে হিসাব বিলের সংখ্যার সাথে মেলেনি");
      if (ev.edited_after_ocr) add("edited", "OCR-এর পড়া সংখ্যা হাতে বদলানো হয়েছে");
      if (typeof ev.ocr_confidence === "number" && ev.ocr_confidence < 60) add("lowOcr", `OCR নিশ্চয়তা কম (${ev.ocr_confidence}%)`);
    }
    const q = Number(p.quantity);
    if (q >= 1000 && q % 1000 === 0) add("round", `সন্দেহজনক গোল সংখ্যা (${q.toLocaleString()}) — মিটার পড়া প্রায় কখনো এমন হয় না`);
    if (m > nowMonth) add("future", `ভবিষ্যতের মাসের record (${m})`);
    const al = alerts.find((a) => a.month === m && a.activity === p.activity);
    if (al) add("anomaly", `প্রত্যাশার চেয়ে ${(al.pct * 100).toFixed(0)}% বেশি ব্যবহার`);
    const score = Math.min(100, flags.reduce((s, f) => s + f.points, 0));
    return { record_id: String(p.record_id), month: m, activity: p.activity, quantity: q, kg: Number(p.kg_co2e), score, level: level(score), flags };
  });
}

/** একটা সময়ের ঝুঁকি (নির্গমনের ওজনে গড়) — passport-এর audit অগ্রাধিকার */
export function periodRisk(risks: RecordRisk[], from?: string, to?: string) {
  const xs = risks.filter((r) => (!from || r.month >= from) && (!to || r.month <= to));
  const kg = xs.reduce((s, r) => s + r.kg, 0) || 1;
  const score = Math.round(xs.reduce((s, r) => s + r.score * r.kg, 0) / kg);
  const top = new Map<string, number>();
  for (const r of xs) for (const f of r.flags) top.set(f.key, (top.get(f.key) ?? 0) + r.kg);
  const reasons = Array.from(top.entries()).sort((a, b) => b[1] - a[1]).map(([k, w]) => ({ key: k, sharePct: Math.round((w / kg) * 100) }));
  const priority = score >= 50 ? "উচ্চ — স্বাধীন audit আগে দরকার" : score >= 25 ? "মাঝারি" : "কম";
  return { score, level: level(score), priority, records: xs.length, high: xs.filter((r) => r.level === "বেশি").length, reasons };
}

// ================= Monte Carlo অনিশ্চয়তা =================
/** প্রতিটা অনুমানের উৎস লেখা — ৯৫% অর্ধ-পরিসর (half-width), স্বাভাবিক বণ্টন ধরা */
export const UNCERTAINTY = {
  quantity: {
    meterVerified: { hw: 0.01, why: "বিল + মিটার রিডিং মিলেছে: শিল্প মিটারের নির্ভুলতা শ্রেণী ১ (IEC 62053-21, ±১%)" },
    billOnly: { hw: 0.02, why: "মূল বিল আছে, মিটার যাচাই নেই: ±২% (অনুমান)" },
    manual: { hw: 0.05, why: "বিল ছাড়া হাতে লেখা/demo: ±৫% (রক্ষণশীল অনুমান)" },
  },
  factor: {
    electricity: { hw: 0.05, why: "Grid factor: বছরভেদে জ্বালানি-মিশ্রণের ওঠানামা ±৫% (Ember বার্ষিক ধারা থেকে অনুমান)" },
    natural_gas: { hw: 0.035, why: "প্রাকৃতিক গ্যাস: IPCC 2006 Vol.2 Table 2.2-এর পরিসর (৫৪.৩–৫৮.৩ বনাম ৫৬.১ t/TJ) ≈ ±৩.৫%" },
    diesel: { hw: 0.015, why: "ডিজেল: IPCC 2006 Vol.2 Table 2.2-এর পরিসর (৭২.৬–৭৪.৮ বনাম ৭৪.১ t/TJ) ≈ ±১.৫%" },
    lpg: { hw: 0.03, why: "LPG: IPCC 2006 Vol.2 Table 2.2-এর পরিসর ≈ ±৩%" },
  } as Record<string, { hw: number; why: string }>,
};

function rng(seed: number) { // mulberry32 — একই seed-এ একই ফল (পুনরুৎপাদনযোগ্য)
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());

/** মোট নির্গমনের সম্ভাব্য বণ্টন। গুণকের ভুল একই জ্বালানির সব record-এ একসাথে (systematic), পরিমাণের ভুল প্রতিটায় আলাদা। */
export function monteCarlo(entries: Entry[], from?: string, to?: string, n = 2000, seed = 42) {
  const recs = foldEvidence(entries).map((e) => e.payload).filter((p) => { const m = String(p.period_month).slice(0, 7); return (!from || m >= from) && (!to || m <= to); });
  const qClass = (p: Record<string, any>) => (meterOk(p) ? "meterVerified" : p.evidence ? "billOnly" : "manual") as keyof typeof UNCERTAINTY.quantity;
  const r = rng(seed), acts = Array.from(new Set(recs.map((p) => p.activity))), sims: number[] = [];
  for (let i = 0; i < n; i++) {
    const fe: Record<string, number> = {};
    for (const a of acts) fe[a] = 1 + ((UNCERTAINTY.factor[a]?.hw ?? 0.05) / 1.96) * normal(r);
    let kg = 0;
    for (const p of recs) kg += Number(p.kg_co2e) * fe[p.activity] * (1 + (UNCERTAINTY.quantity[qClass(p)].hw / 1.96) * normal(r));
    sims.push(kg / 1000);
  }
  sims.sort((a, b) => a - b);
  const pick = (q: number) => sims[Math.min(n - 1, Math.floor(q * n))];
  const central = recs.reduce((s, p) => s + Number(p.kg_co2e), 0) / 1000;
  const mix = { meterVerified: 0, billOnly: 0, manual: 0 };
  for (const p of recs) mix[qClass(p)] += Number(p.kg_co2e) / 1000;
  // IPCC 2006 (Vol.1 Ch.3) অনুযায়ী ৯৫% আস্থা-সীমা: ২.৫ থেকে ৯৭.৫ শতাংশিক
  return { central, lo: pick(0.025), p50: pick(0.5), hi: pick(0.975), level: 95, relPct: central ? ((pick(0.975) - pick(0.025)) / 2 / central) * 100 : 0, n, seed, mix };
}
