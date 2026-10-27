// OCR-এর লেখা থেকে সংখ্যা খোঁজা। মানুষ পরে নিশ্চিত করবে।
const BN = "০১২৩৪৫৬৭৮৯";

export function bnToEn(s: string) {
  return s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
}

const NUM = String.raw`(\d+(?:\.\d+)?)`;

// ক্রম জরুরি: সবচেয়ে নির্ভরযোগ্য ধরন আগে। [ \t]* মানে একই লাইনে — পরের লাইনের লেখা ধরবে না।
const KWH_PATTERNS = [
  new RegExp(String.raw`(?:units?\s*consum\w*|consum\w*\s*units?|ব্যবহৃত\s*ইউনিট|মোট\s*ইউনিট)[^\d\n]{0,20}` + NUM, "i"),
  new RegExp(NUM + String.raw`[ \t]*kwh`, "i"),
  new RegExp(String.raw`(?:kwh|ইউনিট)[^\d\n]{0,20}` + NUM, "i"),
  new RegExp(NUM + String.raw`[ \t]*(?:units?|ইউনিট)`, "i"),
];

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
  return { kwh, month };
}
