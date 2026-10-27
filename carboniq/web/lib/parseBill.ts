// OCR-এর লেখা থেকে সংখ্যা খোঁজা। কোনো বিলের তথ্য এখানে রাখা নেই — শুধু খোঁজার নিয়ম। মানুষ পরে নিশ্চিত করে।
const BN = "০১২৩৪৫৬৭৮৯";

export function bnToEn(s: string) {
  return s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
}

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const SAME_LINE = String.raw`[^\d\n]{0,25}`;

// ক্রম জরুরি: সবচেয়ে নির্ভরযোগ্য ধরন আগে। [ \t]* মানে একই লাইনে — পরের লাইনের লেখা ধরবে না।
const KWH_PATTERNS = [
  new RegExp(String.raw`(?:units?\s*consum\w*|consum\w*\s*units?|ব্যবহৃত\s*ইউনিট|মোট\s*ইউনিট)` + SAME_LINE + NUM, "i"),
  new RegExp(NUM + String.raw`[ \t]*kwh`, "i"),
  new RegExp(String.raw`(?:kwh|ইউনিট)` + SAME_LINE + NUM, "i"),
  new RegExp(NUM + String.raw`[ \t]*(?:units?|ইউনিট)`, "i"),
];

function find(text: string, labels: string): number | null {
  const m = text.match(new RegExp(String.raw`(?:${labels})` + SAME_LINE + NUM, "i"));
  return m ? parseFloat(m[1]) : null;
}

export type MeterCheck = { previous: number; present: number; multiplier: number; expected: number; ok: boolean };

export function parseBill(raw: string) {
  const text = bnToEn(raw).replace(/,/g, "");

  let kwh: number | null = null;
  for (const re of KWH_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const n = parseFloat(m[1]);
      if (n >= 10) { kwh = n; break; } // ১০-এর কম হলে প্রায় নিশ্চিত ভুল (যেমন multiplying factor)
    }
  }

  let month: string | null = null;
  const d = text.match(/(20\d{2})[-/.](\d{1,2})/) || text.match(/(\d{1,2})[-/.](20\d{2})/);
  if (d) {
    const [y, mo] = d[1].length === 4 ? [d[1], d[2]] : [d[2], d[1]];
    const n = parseInt(mo, 10);
    if (n >= 1 && n <= 12) month = `${y}-${String(n).padStart(2, "0")}`;
  }

  // মিটার রিডিং থেকে স্বাধীনভাবে ইউনিট বের করা: (বর্তমান − পূর্ববর্তী) × গুণক
  const previous = find(text, String.raw`previous\s*reading|prev\w*\s*read\w*|পূর্ববর্তী\s*(?:রিডিং|পাঠ)`);
  const present = find(text, String.raw`present\s*reading|current\s*reading|বর্তমান\s*(?:রিডিং|পাঠ)`);
  const multiplier = find(text, String.raw`multiplying\s*factor|\bm\.?\s*f\.?|গুণক`) ?? 1;
  let meter: MeterCheck | null = null;
  if (previous !== null && present !== null && present > previous) {
    const expected = Math.round((present - previous) * multiplier * 100) / 100;
    meter = { previous, present, multiplier, expected, ok: kwh !== null && Math.abs(expected - kwh) <= Math.max(1, kwh * 0.005) };
    if (kwh === null) kwh = expected;
  }

  return { kwh, month, meter };
}

/** কোনো নিয়ম না মিললে: লেখার সব বড় সংখ্যা, যাতে user এক click-এ বেছে নিতে পারে */
export function candidateNumbers(raw: string) {
  const text = bnToEn(raw).replace(/,/g, "");
  const nums = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => n >= 10 && n < 1e8 && !(n >= 1900 && n <= 2100));
  return Array.from(new Set(nums)).slice(0, 12);
}
