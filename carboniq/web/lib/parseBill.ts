// OCR-এর লেখা থেকে সংখ্যা খোঁজা। কোনো বিলের তথ্য এখানে রাখা নেই — শুধু খোঁজার নিয়ম। মানুষ পরে নিশ্চিত করে।
// বাংলাদেশি বিলের ধরন মাথায় রেখে: DESCO/DPDC-র "Current : 06/06/2021 6,577" ধরনের মিটার সারি, "Billing Month : JUNE, 2021"।
const BN = "০১২৩৪৫৬৭৮৯";

export function bnToEn(s: string) {
  return s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
}

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const SAME_LINE = String.raw`[^\d\n]{0,25}`;
// "06/06/2021" — OCR "/"-কে অঙ্ক পড়লে "10670672021" (৮-১১ অঙ্কের একটানা সংখ্যা) হয়ে যায়, সেটাও তারিখ ধরি
const DATE = String.raw`(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\S*|\d{8,11})`;

// ক্রম জরুরি: সবচেয়ে নির্ভরযোগ্য ধরন আগে। [ \t]* মানে একই লাইনে — পরের লাইনের লেখা ধরবে না।
const KWH_PATTERNS = [
  new RegExp(String.raw`(?:kwh\s*consum\w*|units?\s*consum\w*|consum\w*\s*units?|ব্যবহৃত\s*ইউনিট|মোট\s*ইউনিট|difference|পার্থক্য)` + SAME_LINE + NUM, "i"),
  new RegExp(NUM + String.raw`[ \t]*kwh(?![ \t]*(?:charge|rate))`, "i"),
  new RegExp(String.raw`(?:kwh|ইউনিট)(?![^\n]{0,8}(?:charge|rate|চার্জ|tk|taka|টাকা))` + SAME_LINE + NUM, "i"),
  new RegExp(NUM + String.raw`[ \t]*(?:units?|ইউনিট)`, "i"),
];

const MONTH_NAMES: [RegExp, number][] = [
  [/jan|জানু/i, 1], [/feb|ফেব্রু/i, 2], [/mar|মার্চ/i, 3], [/apr|এপ্রি/i, 4], [/may|মে/i, 5], [/jun|জুন/i, 6],
  [/jul|জুলা/i, 7], [/aug|আগ/i, 8], [/sep|সেপ্টে/i, 9], [/oct|অক্টো/i, 10], [/nov|নভে/i, 11], [/dec|ডিসে/i, 12],
];

function find(text: string, labels: string): number | null {
  const m = text.match(new RegExp(String.raw`(?:${labels})` + SAME_LINE + NUM, "i"));
  return m ? parseFloat(m[1]) : null;
}

/** মিটার রিডিং: "6.577" (OCR কমাকে বিন্দু পড়লে) → 6577 */
function reading(raw: string): number {
  return /^\d{1,3}\.\d{3}$/.test(raw) ? Number(raw.replace(".", "")) : Number(raw);
}

/** "Current : 06/06/2021 6577" বা "Present Reading 4938800" */
function meterValue(text: string, labels: string): number | null {
  const withDate = text.match(new RegExp(String.raw`(?:${labels})[^\d\n]{0,12}${DATE}[^\d\n]{1,4}(\d+(?:\.\d+)?)(?=[ \t]|$)`, "im"));
  if (withDate) return reading(withDate[1]);
  // label-এর লাইনে label-এর পরের প্রথম ৩-৭ অঙ্কের সংখ্যা (তারিখের মতো লম্বা সংখ্যা আর টাকা বাদ)
  const line = text.match(new RegExp(String.raw`(?:${labels})([^\n]*)`, "im"));
  if (line) {
    for (const tok of line[1].match(/\d+(?:\.\d+)?/g) ?? []) {
      if (/\.\d{2}$/.test(tok)) break;                  // টাকার কলামে পৌঁছে গেছি
      const digits = tok.replace(".", "").length;
      if (digits >= 8) continue;                          // তারিখ
      if (digits >= 3 && digits <= 7) return reading(tok);
    }
  }
  const plain = text.match(new RegExp(String.raw`(?:${labels})\s*(?:read\w*|রিডিং|পাঠ)[^\d\n]{0,12}(\d+(?:\.\d+)?)`, "i"));
  return plain ? reading(plain[1]) : null;
}

/** "06/06/2021  6,577" — তারিখের ঠিক পরে রিডিং (label OCR-এ গুলিয়ে গেলেও কাজ করে) */
function dateReadings(text: string): number[] {
  const out: number[] = [];
  const re = new RegExp(String.raw`${DATE}[^\d\n]{1,4}(\d+(?:\.\d+)?)(?=[ \t]|$)`, "gm");
  for (const m of text.matchAll(re)) {
    const n = reading(m[1]);
    if (n >= 100 && !(n >= 1900 && n <= 2100) && !/\.\d{2}$/.test(m[1])) out.push(n); // টাকার অঙ্ক (x.xx) আর বছর বাদ
  }
  return out;
}

/** সবচেয়ে বেশিবার আসা বছর (OCR "2021"-কে "202%" পড়লেও অন্য তারিখ থেকে পাওয়া যায়) */
function commonYear(text: string): string | null {
  const ys = text.match(/20[12]\d/g) ?? [];
  const count = new Map<string, number>();
  for (const y of ys) count.set(y, (count.get(y) ?? 0) + 1);
  return Array.from(count.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function findMonth(text: string): string | null {
  // ১. "Billing Month : JUNE, 2021" / "বিলের মাস: জুন ২০২১"
  const bm = text.match(/(?:billing\s*month|bill\s*month|বিলের\s*মাস|মাস)[^\n]{0,4}?([A-Za-zঀ-৿]{3,})[^\n]{0,4}?(20\d{2})?/i);
  if (bm) {
    const hit = MONTH_NAMES.find(([re]) => re.test(bm[1]));
    const year = bm[2] ?? commonYear(text);
    if (hit && year) return `${year}-${String(hit[1]).padStart(2, "0")}`;
  }
  // ২. "2026-11-05" বা "07-2026" ধরনের তারিখ
  const d = text.match(/(20\d{2})[-/.](\d{1,2})(?![\d])/) || text.match(/(?<![\d])(\d{1,2})[-/.](20\d{2})/);
  if (d) {
    const [y, mo] = d[1].length === 4 ? [d[1], d[2]] : [d[2], d[1]];
    const n = parseInt(mo, 10);
    if (n >= 1 && n <= 12) return `${y}-${String(n).padStart(2, "0")}`;
  }
  return null;
}

/** printed = বিলে ছাপা "ব্যবহৃত ইউনিট" (পড়া গেলে); ok = সেটা মিটার রিডিংয়ের হিসাবের সাথে মিলেছে */
export type MeterCheck = { previous: number; present: number; multiplier: number; expected: number; ok: boolean; printed?: number | null };

const PRESENT = String.raw`present|current|বর্তমান`;
const PREVIOUS = String.raw`previous|prev|পূর্ববর্তী`;

type Raw = { kwh: number | null; month: string | null; present: number | null; previous: number | null; multiplier: number | null; dated: number[] };

/** হাজারের বিভাজক মুছে ফেলা: 4,812,300 / 4.812.300 / 4,812.300 / 4.812,300 → 4812300
 *  (৩ অঙ্কের দল দুটো বা বেশি হলে নিশ্চিতভাবে হাজার-বিভাজক; টাকার .xx দুই-অঙ্কের দশমিক ছোঁয়া হয় না) */
export function normalizeNumbers(t: string) {
  return t
    .replace(/(?<![\d.,])\d{1,3}(?:[.,]\d{3}){2,}(?![\d])/g, (m) => m.replace(/[.,]/g, ""))
    .replace(/(\d),(\d)/g, "$1$2");
}

function parseOne(raw: string): Raw {
  const text = normalizeNumbers(bnToEn(raw));
  let kwh: number | null = null;
  for (const re of KWH_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const n = parseFloat(m[1]);
      if (n >= 10) { kwh = n; break; } // ১০-এর কম হলে প্রায় নিশ্চিত ভুল (যেমন multiplying factor)
    }
  }
  return {
    kwh,
    month: findMonth(text),
    present: meterValue(text, PRESENT),
    previous: meterValue(text, PREVIOUS),
    multiplier: find(text, String.raw`multiplying\s*factor|\bm\.?\s*f\.?\b|গুণক`),
    dated: dateReadings(text),
  };
}

// OCR সাধারণত যে অঙ্কগুলো গুলিয়ে ফেলে (বিশেষ করে dot-matrix ছাপায়)
const CONFUSE: Record<string, string[]> = { "6": ["4", "5", "8"], "4": ["6"], "5": ["6", "3"], "3": ["8", "5"], "8": ["3", "6", "0"], "0": ["8"], "1": ["7"], "7": ["1"] };
/** একটা অঙ্ক বদলে সম্ভাব্য আসল রিডিং */
function oneDigitFixes(n: number): number[] {
  const s = String(n), out: number[] = [];
  for (let i = 0; i < s.length; i++) for (const r of CONFUSE[s[i]] ?? []) if (!(i === 0 && r === "0")) out.push(Number(s.slice(0, i) + r + s.slice(i + 1)));
  return out;
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, b * 0.005);

/**
 * এক বা একাধিক OCR পাঠ (একই বিলের ভিন্নভাবে পরিষ্কার করা ছবি) মিলিয়ে সবচেয়ে বিশ্বাসযোগ্য ফল।
 * মিটার রিডিং থেকে স্বাধীনভাবে ইউনিট হিসাব করে "ব্যবহৃত ইউনিট"-এর সাথে মিলিয়ে দেখে।
 */
export function parseBill(input: string | string[]) {
  const reads = (Array.isArray(input) ? input : [input]).map(parseOne);
  const presents = reads.map((r) => r.present).filter((n): n is number => n !== null);
  const previouses = reads.map((r) => r.previous).filter((n): n is number => n !== null);
  const kwhs = reads.map((r) => r.kwh).filter((n): n is number => n !== null);
  const multiplier = reads.map((r) => r.multiplier).find((n) => n !== null && n > 0 && n <= 1000) ?? 1;
  const month = reads.map((r) => r.month).find((m) => m !== null) ?? null;

  // সম্ভাব্য সব (বর্তমান, পূর্ববর্তী) জোড়া — বর্তমান বড় হতে হবে আর পার্থক্য যুক্তিসঙ্গত
  const pairs: { present: number; previous: number; expected: number }[] = [];
  // এক মাসের ব্যবহার মোট রিডিংয়ের একটা ছোট অংশ — OCR একটা অঙ্ক ভুল পড়লে (৬→৪) পার্থক্য অস্বাভাবিক বড় হয়
  const addPairs = (prs: number[], pvs: number[]) => {
    for (const pr of prs) for (const pv of pvs) {
      if (pr > pv && pv >= pr * 0.4) pairs.push({ present: pr, previous: pv, expected: Math.round((pr - pv) * multiplier * 100) / 100 });
    }
  };
  addPairs(presents, previouses);
  // বর্তমান/পূর্ববর্তী দুটোই পড়া গেছে কিন্তু মিলছে না → একটায় এক অঙ্ক ভুল পড়া হয়েছে ধরে চেষ্টা
  if (!pairs.length && presents.length && previouses.length) {
    addPairs(presents.flatMap(oneDigitFixes), previouses);
    addPairs(presents, previouses.flatMap(oneDigitFixes));
  }
  // "Current/Previous" শব্দ পড়া না গেলে: সব পাঠের তারিখ-পরের সংখ্যা একসাথে নিয়ে জোড়া (একই বিল)
  // হাজার-বিভাজক OCR-এ ভেঙে গেলে (4,812,300 → 4,812) দুটো রিডিংই ১০০০ গুণ ছোট পড়ে — লেখা ইউনিটের সাথে মিলিয়ে ঠিক করা
  if (kwhs.length && pairs.length && !pairs.some((p) => kwhs.some((k) => close(p.expected, k)))) {
    for (const p of [...pairs]) for (const f of [1000, 0.001]) {
      const e = Math.round(p.expected * f * 100) / 100;
      if (kwhs.some((k) => close(e, k))) pairs.push({ present: p.present * f, previous: p.previous * f, expected: e });
    }
  }
  if (!pairs.length) { const pool = Array.from(new Set(reads.flatMap((r) => [...r.dated, ...(r.present ? [r.present] : []), ...(r.previous ? [r.previous] : [])]))); addPairs(pool, pool); }
  pairs.sort((a, b) => a.expected - b.expected);
  const agreeing = pairs.find((p) => kwhs.some((k) => close(p.expected, k)));
  const pair = agreeing ?? pairs[0] ?? null;

  // অগ্রাধিকার: (১) লেখা ইউনিট আর মিটার হিসাব মিলেছে → (২) মিটার হিসাব, যদি লেখা ইউনিটের কাছাকাছি মাপের হয়
  // → (৩) লেখা ইউনিট (মিটার হিসাব অস্বাভাবিক ছোট/বড় হলে, যেমন ১২৬ বনাম ১,২৬,৫০০) → (৪) শুধু মিটার
  const printed = kwhs[0] ?? null;
  const plausibleMeter = pair && (printed === null || (pair.expected >= printed * 0.5 && pair.expected <= printed * 2));
  const kwh: number | null = agreeing ? (kwhs.find((k) => close(agreeing.expected, k)) ?? agreeing.expected) : plausibleMeter ? pair!.expected : printed ?? pair?.expected ?? null;

  // ok = বিলে লেখা "ব্যবহৃত ইউনিট" আর মিটার রিডিং থেকে স্বাধীন হিসাব — দুটো আলাদাভাবে পড়ে মিলেছে
  const meter: MeterCheck | null = pair
    ? { previous: pair.previous, present: pair.present, multiplier, expected: pair.expected, ok: !!agreeing, printed: kwhs[0] ?? null }
    : null;
  const source: "label" | "meter" | null = kwh === null ? null : kwhs.some((k) => close(k, kwh!)) ? "label" : "meter";
  return { kwh, month, meter, source };
}

/** কোনো নিয়ম না মিললে: লেখার সব বড় সংখ্যা, যাতে user এক click-এ বেছে নিতে পারে */
export function candidateNumbers(raw: string | string[]) {
  const text = normalizeNumbers(bnToEn(Array.isArray(raw) ? raw.join("\n") : raw));
  const nums = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => n >= 10 && n < 1e8 && !(n >= 1900 && n <= 2100));
  return Array.from(new Set(nums)).slice(0, 12);
}

// ================= গ্যাস, LPG, ডিজেল =================
/** DESNZ 2026-এর নিজের দুই গুণক থেকে LPG-র ঘনত্ব: 1.55713 kg CO2e/লিটার ÷ 2.93936 kg CO2e/kg ≈ 0.53 kg/লিটার */
export const LPG_KG_PER_LITRE = 0.53;

export type Fuel = "electricity" | "natural_gas" | "lpg" | "diesel";

/** লেখা দেখে নথির ধরন চেনা — কোন শব্দ কতবার আছে তার ওজনে */
export function detectActivity(raw: string | string[]): Fuel {
  const t = bnToEn(Array.isArray(raw) ? raw.join("\n") : raw).toLowerCase();
  const score = (re: RegExp) => (t.match(re) ?? []).length;
  const s: Record<Fuel, number> = {
    electricity: score(/kwh|electric|বিদ্যুৎ|power distribution|desco|dpdc|nesco|reb\b|palli bidyut/g) * 2,
    natural_gas: score(/natural gas|gas bill|গ্যাস বিল|titas|bakhrabad|jalalabad|karnaphuli|pashchimanchal|sundarban gas|evc|\bm3\b|m³|cubic met|ঘনমিটার/g) * 2 + score(/\bgas\b|গ্যাস/g),
    lpg: score(/\blpg\b|cylinder|সিলিন্ডার|এলপিজি|bashundhara lp|omera|jamuna lpg/g) * 3,
    diesel: score(/diesel|ডিজেল|\bhsd\b|high speed diesel|fuel station|filling station|পাম্প/g) * 3,
  };
  if (s.lpg) s.natural_gas = Math.max(0, s.natural_gas - score(/\bgas\b|গ্যাস/g)); // "LP gas" যেন প্রাকৃতিক গ্যাস না হয়
  return (Object.entries(s) as [Fuel, number][]).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? (Object.entries(s) as [Fuel, number][]).sort((a, b) => b[1] - a[1])[0][0] : "electricity";
}

/** গ্যাস (m³), LPG (kg → লিটার) বা ডিজেল (লিটার) বিল/রসিদ থেকে পরিমাণ */
export function parseFuel(raw: string | string[], fuel: Exclude<Fuel, "electricity">) {
  const text = normalizeNumbers(bnToEn(Array.isArray(raw) ? raw.join("\n") : raw));
  const month = findMonth(text);
  const first = (res: RegExp[]) => { for (const re of res) { const m = text.match(re); if (m) { const n = parseFloat(m[1]); if (n > 0) return n; } } return null; };
  if (fuel === "natural_gas") {
    const m3 = first([
      new RegExp(String.raw`(?:gas\s*consum\w*|consum\w*|volume|ব্যবহৃত\s*গ্যাস|ব্যবহার)` + SAME_LINE + NUM + String.raw`[ \t]*(?:m3|m³|cubic|ঘনমিটার)?`, "i"),
      new RegExp(NUM + String.raw`[ \t]*(?:m3|m³|cubic\s*met\w*|ঘনমিটার)`, "i"),
    ]);
    const present = find(text, String.raw`present|current|বর্তমান`), previous = find(text, String.raw`previous|prev|পূর্ববর্তী`);
    const meterOk = present !== null && previous !== null && m3 !== null ? Math.abs(present - previous - m3) <= Math.max(1, m3 * 0.005) : null;
    const meter: MeterCheck | null = present !== null && previous !== null && present > previous
      ? { previous, present, multiplier: 1, expected: present - previous, ok: !!meterOk, printed: m3 } : null;
    return { activity: fuel, quantity: m3 ?? meter?.expected ?? null, unit: "m3", month, note: null, meterOk, meter };
  }
  if (fuel === "diesel") {
    const l = first([
      new RegExp(String.raw`(?:quantity|qty|volume|পরিমাণ)` + SAME_LINE + NUM + String.raw`[ \t]*(?:l\b|ltr|litre|liter|লিটার)`, "i"),
      new RegExp(NUM + String.raw`[ \t]*(?:ltrs?|litres?|liters?|লিটার)\b`, "i"),
    ]);
    return { activity: fuel, quantity: l, unit: "litre", month, note: null, meterOk: null, meter: null };
  }
  // LPG: মোট kg, অথবা সিলিন্ডার সংখ্যা × সিলিন্ডারের মাপ; লিটার লেখা থাকলে সরাসরি
  const litres = first([new RegExp(NUM + String.raw`[ \t]*(?:ltrs?|litres?|liters?|লিটার)\b`, "i")]);
  if (litres) return { activity: fuel, quantity: litres, unit: "litre", month, note: "লিটারে লেখা পরিমাণ", meterOk: null, meter: null };
  const totalKg = first([new RegExp(String.raw`(?:total|মোট)[^\d\n]{0,20}` + NUM + String.raw`[ \t]*kg`, "i")]);
  let kg = totalKg;
  if (kg === null) {
    const size = first([new RegExp(NUM + String.raw`[ \t]*kg`, "i")]);
    const count = first([new RegExp(NUM + String.raw`[ \t]*(?:cylinders?|সিলিন্ডার|pcs|টি)`, "i"), new RegExp(String.raw`(?:qty|quantity|পরিমাণ|সংখ্যা)[^\d\n]{0,15}` + NUM + String.raw`(?![ \t]*kg)`, "i")]);
    if (size !== null) kg = size * (count ?? 1);
  }
  return { activity: fuel, quantity: kg === null ? null : Math.round((kg / LPG_KG_PER_LITRE) * 10) / 10, unit: "litre", month, kg,
    note: kg === null ? null : `${kg.toLocaleString()} kg ÷ ${LPG_KG_PER_LITRE} kg/লিটার (DESNZ-এর দুই গুণক থেকে পাওয়া ঘনত্ব) = ${(Math.round((kg / LPG_KG_PER_LITRE) * 10) / 10).toLocaleString()} লিটার`, meterOk: null, meter: null };
}
