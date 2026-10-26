// OCR-এর লেখা থেকে সংখ্যা খোঁজা। মানুষ পরে নিশ্চিত করবে।
const BN = "০১২৩৪৫৬৭৮৯";

export function bnToEn(s: string) {
  return s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
}

export function parseBill(raw: string) {
  const text = bnToEn(raw).replace(/,/g, "");
  let kwh: number | null = null;
  const m =
    text.match(/(\d+(?:\.\d+)?)\s*(?:kwh|units?|ইউনিট)/i) ||
    text.match(/(?:kwh|units?|ইউনিট|consum\w*|ব্যবহৃত)[^\d]{0,25}(\d+(?:\.\d+)?)/i);
  if (m) kwh = parseFloat(m[1]);

  let month: string | null = null;
  const d = text.match(/(20\d{2})[-/.](\d{1,2})/) || text.match(/(\d{1,2})[-/.](20\d{2})/);
  if (d) {
    const [y, mo] = d[1].length === 4 ? [d[1], d[2]] : [d[2], d[1]];
    const n = parseInt(mo, 10);
    if (n >= 1 && n <= 12) month = `${y}-${String(n).padStart(2, "0")}`;
  }
  return { kwh, month };
}
