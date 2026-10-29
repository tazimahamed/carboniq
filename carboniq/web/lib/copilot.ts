// বাংলা Copilot: প্রশ্ন বোঝা → কোন MCP tool → উত্তর তৈরি (template)। কোনো সংখ্যা বানানো হয় না — সব tool-এর ফল থেকে।
const BN = "০১২৩৪৫৬৭৮৯";
export const toEn = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
export const toBn = (s: string | number) => String(s).replace(/\d/g, (d) => BN[Number(d)]);

const MONTHS: [RegExp, number][] = [
  [/জানু|january|\bjan\b/i, 1], [/ফেব্রু|february|\bfeb\b/i, 2], [/মার্চ|march|\bmar\b/i, 3], [/এপ্রি|april|\bapr\b/i, 4],
  [/\bমে\b|^মে|\sমে\s|\bmay\b/i, 5], [/জুন|june|\bjun\b/i, 6], [/জুলা|july|\bjul\b/i, 7], [/আগস্ট|অগাস্ট|august|\baug\b/i, 8],
  [/সেপ্টে|september|\bsep\b/i, 9], [/অক্টো|october|\boct\b/i, 10], [/নভে|november|\bnov\b/i, 11], [/ডিসে|december|\bdec\b/i, 12],
];
export const BN_MONTH = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
export const monthBn = (m: string) => `${BN_MONTH[parseInt(m.slice(5, 7), 10) - 1]} ${toBn(m.slice(0, 4))}`;

const ACTIVITY: [RegExp, string, string][] = [
  [/বিদ্যুৎ|বিদ্যুত|electric|kwh|grid/i, "electricity", "বিদ্যুৎ"],
  [/গ্যাস|gas/i, "natural_gas", "গ্যাস"],
  [/ডিজেল|diesel|জেনারেটর|generator/i, "diesel", "ডিজেল"],
  [/lpg|এলপিজি/i, "lpg", "LPG"],
];
export const ACT_BN: Record<string, string> = { electricity: "বিদ্যুৎ", natural_gas: "প্রাকৃতিক গ্যাস", diesel: "ডিজেল", lpg: "LPG" };

export type Intent =
  | { kind: "total"; from?: string; to?: string; month?: string }
  | { kind: "peak"; year?: string }
  | { kind: "change"; month?: string }
  | { kind: "explain"; month?: string; activity?: string }
  | { kind: "verify" }
  | { kind: "factors"; activity?: string }
  | { kind: "scope" }
  | { kind: "evidence" }
  | { kind: "intensity" }
  | { kind: "alerts" }
  | { kind: "help" };

/** প্রশ্ন থেকে মাস বের করা: "নভেম্বর ২০২৬", "2026-11", "Nov 2026"। বছর না দিলে সাম্প্রতিক বছর ধরা হয় */
export function findMonth(q: string, fallbackYear = "2026"): string | undefined {
  const s = toEn(q);
  const iso = s.match(/(20\d{2})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}`;
  const year = s.match(/20\d{2}/)?.[0] ?? fallbackYear;
  for (const [re, n] of MONTHS) if (re.test(s)) return `${year}-${String(n).padStart(2, "0")}`;
  return undefined;
}

export function route(question: string): Intent {
  const q = toEn(question).toLowerCase();
  const month = findMonth(question);
  const activity = ACTIVITY.find(([re]) => re.test(q))?.[1];
  const year = q.match(/20\d{2}/)?.[0];

  if (/evidence|score|স্কোর|বিশ্বাসযোগ্য|মান কেমন|কতটা প্রমাণ/.test(q)) return { kind: "evidence" };
  if (/পিস|piece|per unit|প্রতি একক|intensity/.test(q)) return { kind: "intensity" };
  if (/অস্বাভাবিক|সমস্যা|anomal|alert|সতর্ক|জেনারেটর|generator|load.?shedding|লোডশেডিং|ক্ষতি|নষ্ট|অপচয়/.test(q)) return { kind: "alerts" };
  if (/ledger|লেজার|hash|হ্যাশ|বদলানো|বদলেছে|tamper|অক্ষত|নিরাপদ|বিশ্বাস|যাচাই|verify/.test(q)) return { kind: "verify" };
  if (/গুণক|factor|উৎস|source|\bdesnz\b|\bember\b|license|লাইসেন্স/.test(q)) return { kind: "factors", activity };
  if (/scope|স্কোপ/.test(q) && /কী|কি|মানে|what|mean|পার্থক্য|difference/.test(q)) return { kind: "scope" };
  if (/কেন|why|বাড়|বেড়|কম(ল|েছে)|কমে|change|তুলনা|compare|increase|decrease|গত মাস/.test(q)) return { kind: "change", month };
  if (/সবচেয়ে|সর্বোচ্চ|সর্বনিম্ন|highest|peak|most|lowest|max|min/.test(q)) return { kind: "peak", year };
  if (/কীভাবে|কিভাবে|ব্যাখ্যা|হিসাব কর|সূত্র|formula|explain|how (is|was|did|are)|calculat|প্রমাণ|বিল দেখা|evidence/.test(q) && !/how much|how many/.test(q)) return { kind: "explain", month, activity };
  if (/কত|মোট|নির্গমন|কার্বন|carbon|emission|total|co2|টন/.test(q) || month) {
    if (month) return { kind: "total", month, from: month, to: month };
    if (year) return { kind: "total", from: `${year}-01`, to: `${year}-12` };
    return { kind: "total" };
  }
  return { kind: "help" };
}

export type ToolCall = { name: string; arguments: Record<string, unknown> };

export function toolsFor(intent: Intent): ToolCall[] {
  switch (intent.kind) {
    case "total": return [{ name: "get_emissions", arguments: { ...(intent.from ? { from: intent.from } : {}), ...(intent.to ? { to: intent.to } : {}), group_by: "month" } }];
    case "peak": return [{ name: "get_emissions", arguments: intent.year ? { from: `${intent.year}-01`, to: `${intent.year}-12` } : {} }];
    case "change": return [{ name: "get_emissions", arguments: {} }];
    case "explain": return intent.month ? [{ name: "explain_calculation", arguments: { month: intent.month, ...(intent.activity ? { activity: intent.activity } : {}) } }] : [];
    case "verify": return [{ name: "verify_ledger", arguments: {} }];
    case "factors": return [{ name: "get_factors", arguments: {} }];
    case "evidence": case "intensity": case "alerts": return [{ name: "get_insights", arguments: {} }];
    default: return [];
  }
}

const t2 = (n: number) => toBn(n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

/** key = যে সংখ্যাগুলো AI-এর উত্তরে থাকতেই হবে; key না থাকলে AI দিয়ে নতুন করে বলানো হয় না */
export type Answer = { text: string; sources: string[]; key?: string[] };

/** tool-এর ফল থেকে বাংলা উত্তর। results[i] = toolsFor(intent)[i]-এর structuredContent (বা error লেখা) */
export function compose(intent: Intent, results: any[]): Answer {
  const r = results[0];
  if (typeof r === "string") return { text: `দুঃখিত, ${r}`, sources: [] };
  if (intent.kind === "explain" && !intent.month) return { text: "কোন মাসের হিসাব ব্যাখ্যা করব? যেমন: \"নভেম্বর ২০২৬-এর বিদ্যুৎ কীভাবে হিসাব হলো?\"", sources: [] };
  switch (intent.kind) {
    case "total": {
      if (!r.records) return { text: intent.month ? `${monthBn(intent.month)}-এর কোনো নিশ্চিত record নেই। বিল upload করলে হিসাব যোগ হবে।` : "এখনো কোনো নিশ্চিত record নেই।", sources: ["get_emissions"] };
      const span = r.period.months === 1 ? monthBn(r.period.from) : `${monthBn(r.period.from)} থেকে ${monthBn(r.period.to)} (${toBn(r.period.months)} মাস)`;
      return {
        text: `${span}-এ মোট নির্গমন **${t2(r.total)} টন CO₂e**।\n• Scope 1 (গ্যাস, ডিজেল): ${t2(r.scope_1)} টন\n• Scope 2 (বিদ্যুৎ): ${t2(r.scope_2_location_based)} টন\n\n${toBn(r.records)}টা record, সবগুলো মানুষের নিশ্চিত করা ও hash-সিল করা; এর মধ্যে ${toBn(r.evidence.original_bill_attached_L2)}টায় মূল বিল সংযুক্ত। Ledger ${r.ledger_valid ? "অক্ষত ✓" : "⚠ গরমিল"}।`,
        sources: ["get_emissions"],
        key: [t2(r.total)],
      };
    }
    case "peak": {
      const ms = (r.by_month ?? []) as { month: string; total: number }[];
      if (!ms.length) return { text: "তুলনা করার মতো ডেটা নেই।", sources: ["get_emissions"] };
      const hi = ms.reduce((a, b) => (b.total > a.total ? b : a)), lo = ms.reduce((a, b) => (b.total < a.total ? b : a));
      return { text: `সবচেয়ে বেশি নির্গমন **${monthBn(hi.month)}-এ: ${t2(hi.total)} টন**।\nসবচেয়ে কম ${monthBn(lo.month)}-এ: ${t2(lo.total)} টন।\nপার্থক্য ${toBn(pct(hi.total, lo.total).toFixed(0))}%।`, sources: ["get_emissions"], key: [t2(hi.total)] };
    }
    case "change": {
      const ms = (r.by_month ?? []) as { month: string; total: number; scope_1: number; scope_2: number }[];
      if (ms.length < 2) return { text: "তুলনার জন্য অন্তত দুই মাসের ডেটা লাগবে।", sources: ["get_emissions"] };
      let i = intent.month ? ms.findIndex((x) => x.month === intent.month) : ms.length - 1;
      if (i < 0) return { text: `${monthBn(intent.month!)}-এর কোনো ডেটা নেই।`, sources: ["get_emissions"] };
      if (i === 0) i = 1;
      const cur = ms[i], prev = ms[i - 1];
      const d = pct(cur.total, prev.total), d1 = pct(cur.scope_1, prev.scope_1), d2 = pct(cur.scope_2, prev.scope_2);
      const dir = (x: number) => (x >= 0 ? `${toBn(x.toFixed(1))}% বেড়েছে` : `${toBn(Math.abs(x).toFixed(1))}% কমেছে`);
      const main = Math.abs(d2) >= Math.abs(d1) ? "বিদ্যুৎ (scope 2)" : "জ্বালানি (scope 1: গ্যাস/ডিজেল)";
      return {
        text: `${monthBn(prev.month)} থেকে ${monthBn(cur.month)}-এ মোট নির্গমন ${dir(d)} (${t2(prev.total)} → ${t2(cur.total)} টন)।\n• Scope 1: ${dir(d1)}\n• Scope 2: ${dir(d2)}\n\nবড় পরিবর্তন এসেছে ${main} থেকে। কারণ জানতে ওই মাসের উৎপাদন আর আবহাওয়ার সাথে মিলিয়ে দেখুন — গরমের মাসে বিদ্যুৎ বেশি লাগা স্বাভাবিক, কিন্তু উৎপাদন না বাড়লে যন্ত্রে সমস্যা থাকতে পারে।`,
        sources: ["get_emissions"],
        key: [t2(prev.total), t2(cur.total)],
      };
    }
    case "explain": {
      const lines = (r.records as any[]).slice(0, 3).map((x) => {
        const bill = x.bill
          ? `মূল বিল সংযুক্ত (SHA-256 ${x.bill.sha256.slice(0, 12)}…)${x.bill.meter_check ? (x.bill.meter_check.ok ? `, মিটার রিডিং মিলেছে: (${toBn(x.bill.meter_check.present.toLocaleString("en-US"))} − ${toBn(x.bill.meter_check.previous.toLocaleString("en-US"))}) × ${toBn(x.bill.meter_check.multiplier)} = ${toBn(x.bill.meter_check.expected.toLocaleString("en-US"))}` : ", ⚠ মিটার রিডিং মেলেনি") : ""}`
          : "synthetic demo record, মূল বিল নেই";
        return `**${ACT_BN[x.activity] ?? x.activity}, ${monthBn(x.month)}**\n${toBn(Number(x.quantity).toLocaleString("en-US"))} ${x.unit} × ${toBn(x.factor.value)} kg CO₂e/${x.unit} = ${t2(x.result_t_co2e)} টন (scope ${toBn(x.scope)})\nগুণকের উৎস: ${x.factor.source} (${x.factor.license})\nপ্রমাণ: ${bill}\nLedger hash: ${x.ledger.hash.slice(0, 16)}…`;
      });
      return { text: lines.join("\n\n") + "\n\nহিসাবে কোনো AI ব্যবহার হয়নি — শুধু পরিমাণ × গুণক, তাই যে কেউ মিলিয়ে দেখতে পারেন।", sources: ["explain_calculation"] };
    }
    case "verify":
      return {
        text: r.valid
          ? `✓ Ledger অক্ষত। ${toBn(r.entries)}টা record-এর পুরো SHA-256 chain এইমাত্র আবার হিসাব করে দেখা হলো — কোনো record পরে বদলানো হয়নি।\nশেষ hash: ${String(r.last_hash).slice(0, 20)}…`
          : `⚠ Ledger-এ গরমিল পাওয়া গেছে — কোনো record সিল হওয়ার পর বদলানো হয়েছে। Auditor-কে জানান।`,
        sources: ["verify_ledger"],
      };
    case "factors": {
      const fs = (r.factors as any[]).filter((f) => !intent.activity || f.activity === intent.activity);
      return {
        text: "ব্যবহৃত গুণক:\n" + fs.map((f) => `• ${ACT_BN[f.activity] ?? f.activity}: ${toBn(f.kgPerUnit)} kg CO₂e/${f.unit} (scope ${toBn(f.scope)}) — ${f.source}, ${f.license}`).join("\n"),
        sources: ["get_factors"],
      };
    }
    case "evidence": {
      const e = r.evidence_score;
      return {
        text: `Evidence Score **${toBn(e.score)}/১০০** (${e.grade})।\n` + e.parts.map((p: any) => `• ${p.part}: ${toBn(p.got)}/${toBn(p.max)}`).join("\n") +
          (e.improve?.length ? `\n\nবাড়াতে: ${e.improve[0]}` : "") + "\n\nএটা CarbonIQ-এর নিজস্ব মান-নির্দেশক, কোনো সরকারি সনদ নয়।",
        sources: ["get_insights"], key: [toBn(e.score)],
      };
    }
    case "intensity": {
      if (r.kg_co2e_per_piece === null) return { text: "উৎপাদনের ডেটা নেই, তাই প্রতি পিসের হিসাব করা যাচ্ছে না।", sources: ["get_insights"] };
      const ms = r.by_month_kg_per_piece as { month: string; kg_per_piece: number }[];
      const hi = ms.reduce((a, b) => (b.kg_per_piece > a.kg_per_piece ? b : a)), lo = ms.reduce((a, b) => (b.kg_per_piece < a.kg_per_piece ? b : a));
      return { text: `গড়ে প্রতি পিসে **${toBn(r.kg_co2e_per_piece.toFixed(3))} কেজি CO₂e**।\nসবচেয়ে বেশি ${monthBn(hi.month)}-এ (${toBn(hi.kg_per_piece.toFixed(3))}), সবচেয়ে কম ${monthBn(lo.month)}-এ (${toBn(lo.kg_per_piece.toFixed(3))})।\n\nকারখানার মাসিক নির্গমন ওই মাসের উৎপাদিত পিস দিয়ে ভাগ করে হিসাব। Buyer-ভিত্তিক passport Passport পাতা থেকে বানানো যায়।`, sources: ["get_insights"], key: [toBn(r.kg_co2e_per_piece.toFixed(3))] };
    }
    case "alerts": {
      const lines = (r.anomalies as any[]).slice(0, 3).map((a) => `• ${monthBn(a.month)}: ${ACT_BN[a.activity] ?? a.activity} প্রত্যাশার চেয়ে ${toBn(a.pct_above_expected)}% বেশি — আনুমানিক ক্ষতি ৳${toBn(a.est_loss_tk.toLocaleString("en-IN"))}। ${a.hint}`);
      const g = r.generator;
      if (g?.litres) lines.push(`• Load-shedding: জেনারেটরে ${toBn(g.litres.toLocaleString())} লিটার ডিজেল, grid-এর তুলনায় আনুমানিক বাড়তি ৳${toBn(Math.round(g.est_extra_cost_tk / 1000).toLocaleString("en-IN"))} হাজার।`);
      return { text: lines.length ? `যা চোখে পড়েছে:\n${lines.join("\n")}\n\n(${r.assumptions})` : "কোনো অস্বাভাবিকতা পাওয়া যায়নি।", sources: ["get_insights"] };
    }
    case "scope":
      return { text: "**Scope 1** = factory-তে নিজে জ্বালানি পোড়ানো থেকে সরাসরি নির্গমন: গ্যাস বয়লার, ডিজেল জেনারেটর, LPG।\n**Scope 2** = কেনা বিদ্যুৎ থেকে পরোক্ষ নির্গমন: grid-এর বিদ্যুৎ যে power plant-এ তৈরি হয় সেখানকার নির্গমন।\n**Scope 3** = supplier, পরিবহন, বর্জ্য ইত্যাদি (CarbonIQ-এর roadmap-এ আছে)।\n\nসূত্র: GHG Protocol Corporate Standard।", sources: [] };
    default:
      return { text: "আমি এই factory-র কার্বন হিসাব নিয়ে প্রশ্নের উত্তর দিতে পারি। যেমন:\n• মোট নির্গমন কত?\n• নভেম্বর ২০২৬-এ কত হয়েছে?\n• কোন মাসে সবচেয়ে বেশি?\n• অক্টোবরে কেন বাড়ল/কমল?\n• নভেম্বরের বিদ্যুৎ কীভাবে হিসাব হলো?\n• Ledger কি অক্ষত?\n• কোন গুণক ব্যবহার হয়েছে?", sources: [] };
  }
}

// ===== Guardrail =====
const REFUSAL = /নেই|জানি না|পারছি না|দুঃখিত|don't know|not available|cannot/i;
const norm = (s: string) => toEn(s).replace(/,/g, "");
function numbersIn(s: string): number[] {
  return (norm(s).match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** AI-এর উত্তর তখনই গ্রহণ: (১) মূল সংখ্যাগুলো সব আছে, (২) ডেটার বাইরের কোনো সংখ্যা নেই, (৩) "তথ্য নেই" ধরনের অস্বীকার নেই */
export function verifyAi(aiText: string, answer: Answer, toolResults: unknown[]): { ok: boolean; reason?: string } {
  if (!aiText || aiText.length < 15) return { ok: false, reason: "empty" };
  const key = answer.key ?? [];
  const have = new Set(numbersIn(aiText).map((n) => n.toFixed(2)));
  for (const k of key) if (!have.has(Number(norm(k)).toFixed(2))) return { ok: false, reason: `missing ${k}` };
  if (REFUSAL.test(aiText)) return { ok: false, reason: "refusal" };
  const allowed = new Set<string>();
  for (const src of [answer.text, JSON.stringify(toolResults)]) for (const n of numbersIn(src)) {
    allowed.add(n.toFixed(2)); allowed.add(n.toFixed(1)); allowed.add(String(Math.round(n)));
  }
  const bad = numbersIn(aiText).filter((n) => n > 12 && !(n >= 2020 && n <= 2030) && !allowed.has(n.toFixed(2)) && !allowed.has(n.toFixed(1)) && !allowed.has(String(n)));
  return bad.length ? { ok: false, reason: `unknown ${bad.join(",")}` } : { ok: true };
}

/** AI-কে দেওয়ার জন্য সংক্ষিপ্ত তথ্য (markdown ছাড়া) */
export function factsFor(answer: Answer) {
  return answer.text.replace(/\*\*/g, "").replace(/^•\s*/gm, "- ").trim();
}
