// OCR-এর লেখা থেকে সংখ্যা খোঁজা। কোনো বিলের তথ্য এখানে রাখা নেই — শুধু খোঁজার নিয়ম। মানুষ পরে নিশ্চিত করে।
// বাংলাদেশি বিলের ধরন মাথায় রেখে: DESCO/DPDC-র "Current : 06/06/2021 6,577" ধরনের মিটার সারি, "Billing Month : JUNE, 2021"।
const BN = "০১২৩৪৫৬৭৮৯";

export function bnToEn(s: string) {
  return s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
}

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const SAME_LINE = String.raw`[^\d\n]{0,25}`;
const DATE = String.raw`\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\S*`;

// ক্রম জরুরি: সবচেয়ে নির্ভরযোগ্য ধরন আগে। [ \t]* মানে একই লাইনে — পরের লাইনের লেখা ধরবে না।
const KWH_PATTERNS = [
  new RegExp(String.raw`(?:kwh\s*consum\w*|units?\s*consum\w*|consum\w*\s*units?|ব্যবহৃত\s*ইউনিট|মোট\s*ইউনিট)` + SAME_LINE + NUM, "i"),
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
  const plain = text.match(new RegExp(String.raw`(?:${labels})\s*(?:read\w*|রিডিং|পাঠ)[^\d\n]{0,12}(\d+(?:\.\d+)?)`, "i"));
  return plain ? reading(plain[1]) : null;
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

type Raw = { kwh: number | null; month: string | null; present: number | null; previous: number | null; multiplier: number | null };

function parseOne(raw: string): Raw {
  const text = bnToEn(raw).replace(/(\d),(\d)/g, "$1$2");
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
  };
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
  for (const pr of presents) for (const pv of previouses) {
    if (pr > pv && pv >= pr * 0.4) pairs.push({ present: pr, previous: pv, expected: Math.round((pr - pv) * multiplier * 100) / 100 });
  }
  pairs.sort((a, b) => a.expected - b.expected);
  const agreeing = pairs.find((p) => kwhs.some((k) => close(p.expected, k)));
  const pair = agreeing ?? pairs[0] ?? null;

  // অগ্রাধিকার: (১) লেখা ইউনিট আর মিটার হিসাব মিলেছে → (২) মিটার রিডিং থেকে হিসাব → (৩) শুধু লেখা ইউনিট
  const kwh: number | null = agreeing ? agreeing.expected : pair ? pair.expected : kwhs[0] ?? null;

  // ok = বিলে লেখা "ব্যবহৃত ইউনিট" আর মিটার রিডিং থেকে স্বাধীন হিসাব — দুটো আলাদাভাবে পড়ে মিলেছে
  const meter: MeterCheck | null = pair
    ? { previous: pair.previous, present: pair.present, multiplier, expected: pair.expected, ok: !!agreeing, printed: kwhs[0] ?? null }
    : null;
  const source: "label" | "meter" | null = kwh === null ? null : kwhs.some((k) => close(k, kwh!)) ? "label" : "meter";
  return { kwh, month, meter, source };
}

/** কোনো নিয়ম না মিললে: লেখার সব বড় সংখ্যা, যাতে user এক click-এ বেছে নিতে পারে */
export function candidateNumbers(raw: string | string[]) {
  const text = bnToEn(Array.isArray(raw) ? raw.join("\n") : raw).replace(/(\d),(\d)/g, "$1$2");
  const nums = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => n >= 10 && n < 1e8 && !(n >= 1900 && n <= 2100));
  return Array.from(new Set(nums)).slice(0, 12);
}
