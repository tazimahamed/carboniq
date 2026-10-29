// CarbonIQ evaluation suite — আসল code-এর উপর চলে, ফল eval/results.json-এ লেখে
// চালাতে: node eval/run.ts   (Node 22+, type stripping)
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { calculate } from "../lib/engine.ts";
import { GENESIS, makeHash, verifyChain } from "../lib/ledger.ts";
import { parseBill } from "../lib/parseBill.ts";
import { compose, route, toolsFor, verifyAi, type Answer } from "../lib/copilot.ts";
import { handleRpc, type LedgerEntry } from "../lib/mcp.ts";
import { anomalies, evidenceScore, generator, intensity, buyerShare } from "../lib/insights.ts";
import { demoMonths, BUYERS } from "../lib/demoModel.ts";
import { ledgerToRows } from "../lib/passportRows.ts";
import { detectActivity, parseFuel } from "../lib/parseBill.ts";
import { PROJECTS, evaluate, optimize, annuity } from "../lib/planner.ts";
import { buildPassport, verifyPassport, newPassportId } from "../lib/passport.ts";
import { qrMatrix } from "../lib/qr.ts";

type Case = { name: string; pass: boolean; detail?: string };
const suites: { id: string; title: string; what: string; cases: Case[] }[] = [];
const suite = (id: string, title: string, what: string) => { const s = { id, title, what, cases: [] as Case[] }; suites.push(s); return s; };

// ---------- ১. হিসাবের engine ----------
{
  const s = suite("engine", "নির্গমন হিসাব", "হাতে হিসাব করা মানের সাথে engine-এর ফল (±০.০০১ kg)");
  const cases: [string, number, string, number][] = [
    ["electricity", 120000, "kWh", 83520], ["electricity", 1, "kWh", 0.696], ["natural_gas", 45000, "m3", 91184.85],
    ["diesel", 3200, "litre", 8267.328], ["lpg", 500, "litre", 778.565], ["electricity", 0, "kWh", 0],
  ];
  for (const [a, q, u, exp] of cases) { const r = calculate(a, q, u); s.cases.push({ name: `${a} ${q} ${u}`, pass: Math.abs(r.kg_co2e - exp) < 0.001, detail: `${r.kg_co2e} vs ${exp}` }); }
  const same = JSON.stringify(calculate("diesel", 77, "litre")) === JSON.stringify(calculate("diesel", 77, "litre"));
  s.cases.push({ name: "একই input → একই ফল (deterministic)", pass: same });
  for (const [a, q, u] of [["electricity", -5, "kWh"], ["coal", 10, "kg"], ["electricity", NaN, "kWh"]] as [string, number, string][]) {
    let threw = false; try { calculate(a, q, u); } catch { threw = true; }
    s.cases.push({ name: `ভুল input আটকায়: ${a} ${q}`, pass: threw });
  }
}

// ---------- ২. Ledger ----------
{
  const s = suite("ledger", "Hash ledger অখণ্ডতা", "Record বদলানো, মুছে ফেলা, ক্রম বদলানো — সব ধরা পড়ে কিনা");
  const build = () => { const c: any[] = []; let p = GENESIS; for (let i = 0; i < 30; i++) { const payload = { i, kg: i * 10 }; const h = makeHash(payload, p); c.push({ payload, prev_hash: p, hash: h }); p = h; } return c; };
  s.cases.push({ name: "অক্ষত chain → valid", pass: verifyChain(build()) });
  let c = build(); c[10].payload.kg = 999; s.cases.push({ name: "মাঝের record-এর সংখ্যা বদলানো → ধরা পড়ে", pass: !verifyChain(c) });
  c = build(); c.splice(5, 1); s.cases.push({ name: "একটা record মুছে ফেলা → ধরা পড়ে", pass: !verifyChain(c) });
  c = build(); [c[3], c[4]] = [c[4], c[3]]; s.cases.push({ name: "দুটো record-এর ক্রম বদলানো → ধরা পড়ে", pass: !verifyChain(c) });
  c = build(); c[29].hash = "f".repeat(64); s.cases.push({ name: "শেষ hash বদলানো → ধরা পড়ে", pass: !verifyChain(c) });
  c = build(); const last = c[29]; const fake = { payload: { i: 30, kg: 1 }, prev_hash: last.hash, hash: makeHash({ i: 30, kg: 1 }, last.hash) }; c.push(fake);
  s.cases.push({ name: "নিয়ম মেনে নতুন record যোগ → valid থাকে", pass: verifyChain(c) });
}

// ---------- ৩. বিল থেকে সংখ্যা (parser) ----------
{
  const s = suite("parser", "বিল থেকে ইউনিট ও মাস বের করা", "নানা ধরনের বিলের লেখা (বাংলা/English) থেকে সঠিক kWh, মাস আর মিটার যাচাই");
  const cases: [string, number | null, string | null][] = [
    ["Units Consumed: 126,500 kWh\nBill Date: 2026-11-05", 126500, "2026-11"],
    ["Multiplying Factor :1\nUnits Consumed: 900 kWh", 900, null],
    ["ব্যবহৃত ইউনিট: ২৩৫\nবিলের মাস: ০৭-২০২৬", 235, "2026-07"],
    ["মোট ইউনিট ৩৪৫", 345, null],
    ["Total 1,20,000 kWh", 120000, null],
    ["Consumption Units 4120 for 03/2026", 4120, "2026-03"],
    ["পূর্ববর্তী রিডিং: ১২৩০০\nবর্তমান রিডিং: ১২৫৩৫", 235, null],
    ["Previous Reading 50000\nPresent Reading 50820\nMF 2", 1640, null],
    ["Amount Tk 5,230 Due date 2026-08-20", null, "2026-08"],
  ];
  for (const [text, kwh, month] of cases) {
    const r = parseBill(text);
    const ok = r.kwh === kwh && (month === null || r.month === month);
    s.cases.push({ name: text.split("\n")[0].slice(0, 40), pass: ok, detail: `kwh=${r.kwh} month=${r.month}` });
  }
  const r = parseBill("Previous Reading 4812300\nPresent Reading 4938800\nUnits Consumed 126500 kWh");
  s.cases.push({ name: "মিটার রিডিং মিললে ok=true", pass: r.meter?.ok === true });
  const w = parseBill("Previous Reading 4812300\nPresent Reading 4938800\nUnits Consumed 99000 kWh");
  s.cases.push({ name: "মিটার রিডিং না মিললে ok=false (ভুল/নকল বিল ধরা)", pass: w.meter?.ok === false });
  // OCR-এ হাজার-বিভাজক নানা ভাবে পড়া হলে
  for (const [label, prev, pres] of [["কমা-ডট মিশ্র (4,812.300)", "4,812.300", "4,938.800"], ["ইউরোপীয় (4.812.300)", "4.812.300", "4.938.800"], ["শেষ দল হারানো (4,812)", "4,812", "4,938"], ["ফাঁকা (4,812 300)", "4,812,300", "4,938,800"]]) {
    const t = parseBill(`Billing Month : November 2026\nPrevious Reading : ${prev}\nPresent Reading : ${pres}\nMultiplying Factor : 1\nUnits Consumed: 126,500 kWh`);
    s.cases.push({ name: `হাজার-বিভাজক: ${label} → 126,500`, pass: t.kwh === 126500, detail: `kwh=${t.kwh} meter=${t.meter?.previous}→${t.meter?.present} ok=${t.meter?.ok}` });
  }
}

// ---------- ৪. OCR (Tesseract, নমুনা বিল) ----------
{
  const s = suite("ocr", "OCR → সংখ্যা (end-to-end)", "বিলের ছবি → Tesseract (ben+eng) → parser → সঠিক kWh ও মাস। নমুনা বিল synthetic।");
  const imgs: [string, number, string][] = [["sample_bill_sep2026.jpg", 116790, "2026-09"], ["sample_bill_oct2026.jpg", 112970, "2026-10"]];
  for (const [f, kwh, month] of imgs) {
    try {
      const text = execSync(`tesseract ${process.env.SAMPLES ?? "../samples"}/${f} - -l eng 2>/dev/null`).toString();
      const r = parseBill(text);
      s.cases.push({ name: f, pass: r.kwh === kwh && r.month === month && r.meter?.ok === true, detail: `kwh=${r.kwh} month=${r.month} meter=${r.meter?.ok}` });
    } catch { s.cases.push({ name: f, pass: false, detail: "tesseract পাওয়া যায়নি" }); }
  }
}

// ---------- ৪খ. আসল DESCO বিল (OCR-এর আসল আউটপুট, নাম-ঠিকানা-account বাদ) ----------
{
  const s = suite("real", "আসল DESCO বিল (জুন ২০২১)", "আসল বিলের ছবি → দুই রকম পরিষ্কার → Tesseract → parser। বিলে লেখা: ব্যবহৃত ৫৮ kWh, বর্তমান ৬,৫৭৭, পূর্ববর্তী ৬,৫১৯");
  const fx = JSON.parse(readFileSync(new URL("./fixtures/desco_2021_06_ocr.json", import.meta.url), "utf8"));
  const [g, b] = [fx["js_gray.txt"], fx["js_bin.txt"]];
  const one = parseBill(g);
  s.cases.push({ name: "শুধু এক রকম ছবি → সঠিক ইউনিট পায় না (তাই দুই রকম লাগে)", pass: one.kwh !== 58, detail: `kwh=${one.kwh}` });
  const both = parseBill([g, b]);
  s.cases.push({ name: "দুই রকম মিলিয়ে → ৫৮ kWh", pass: both.kwh === 58, detail: `kwh=${both.kwh}` });
  s.cases.push({ name: "মাস → জুন ২০২১ (OCR বছর ভুল পড়লেও)", pass: both.month === "2021-06", detail: `month=${both.month}` });
  s.cases.push({ name: "মিটার: ৬,৫৭৭ − ৬,৫১৯ (৬→৪ ভুল পড়াটা বাদ দিয়ে)", pass: both.meter?.present === 6577 && both.meter?.previous === 6519, detail: JSON.stringify(both.meter) });
  const garble = (t: string) => t.replace(/Current|Curent/g, "কিউরেন্ট").replace(/Previous/g, "প্রিভি");
  const nl = parseBill([garble(g), garble(b)]);
  s.cases.push({ name: "\"Current/Previous\" শব্দ OCR-এ গুলিয়ে গেলেও → ৫৮ (তারিখ-পরের রিডিং থেকে)", pass: nl.kwh === 58, detail: `kwh=${nl.kwh}` });
  const br = parseBill("কি: 06/06/2021 4,577 0 Demand Charge : 60. 00\nপ্র: 06/05/2021 4,519 0 Sub-Total : 303. 02\nIssue Date: 15/06/2021 Due Date : 14/07/2021");
  s.cases.push({ name: "browser-এর আসল ভুল: দুই রিডিংয়েই ৬→৪, label নেই → তবু ৫৮", pass: br.kwh === 58, detail: `kwh=${br.kwh}` });
  const bline = "Billing Month : JUNE, 2021\nIssue Date: 15/06/2021 Due Date : 14/07/2021\nCurrent 10670672021 4,577 0 Demand Charge : 60. 00";
  const bb = parseBill([bline + "\nPrevious 10670572021 4,519 0 Sub-Total : 303. 02"]);
  s.cases.push({ name: "browser-এর আসল লাইন: তারিখের \"/\" অঙ্ক হয়ে গেছে (10670672021) → তবু ৫৮", pass: bb.kwh === 58, detail: `kwh=${bb.kwh}` });
  const mix = parseBill([bline, "Previous :06/05/2021 © 6519 . - Sub-Total : 303. 02"]);
  s.cases.push({ name: "এক পাঠে ৬→৪, অন্য পাঠে ঠিক → এক অঙ্ক ভুল ধরে ৫৮", pass: mix.kwh === 58, detail: `kwh=${mix.kwh}` });
  const bw = JSON.parse(readFileSync(new URL("./fixtures/desco_2021_06_browser.json", import.meta.url), "utf8"));
  const real = parseBill([bw.pass1, bw.pass2]);
  s.cases.push({ name: "★ browser-এর পুরো আসল OCR (ben+eng, দুই পাঠ) → ৫৮ kWh, জুন ২০২১", pass: real.kwh === 58 && real.month === "2021-06", detail: `kwh=${real.kwh} month=${real.month}` });
  s.cases.push({ name: "\"KWH Charge 243.02\" (টাকা) ইউনিট হিসেবে নেয় না", pass: both.kwh !== 243, detail: `kwh=${both.kwh}` });
}

// ---------- demo ledger (MCP ও copilot-এর জন্য) ----------
const rows: LedgerEntry[] = []; { let p = GENESIS;
  const SEASON = [0.85, 0.8, 0.85, 0.95, 1.1, 1.2, 1.25, 1.2, 1.15, 1.1, 1.05, 0.95];
  const add = (a: string, q: number, u: string, m: string, ev?: any) => { const payload: any = { record_id: `r${rows.length}`, period_month: `${m}-01`, ...calculate(a, q, u), ...(ev ? { evidence: ev, evidence_level: "L2+L3" } : { evidence_level: "L1+L3" }) }; const h = makeHash(payload, p); rows.push({ id: rows.length + 1, payload, prev_hash: p, hash: h }); p = h; };
  for (let i = 0; i < 12; i++) { const m = new Date(Date.UTC(2025, 10 + i, 1)).toISOString().slice(0, 7); add("electricity", Math.round(120000 * SEASON[i]), "kWh", m); add("natural_gas", Math.round(45000 * (2 - SEASON[i])), "m3", m); if (i % 3 === 0) add("diesel", 3200, "litre", m); }
  add("electricity", 126500, "kWh", "2026-11", { file_hash: "ab".repeat(32), meter_check: { previous: 4812300, present: 4938800, multiplier: 1, expected: 126500, ok: true } });
}
const load = async () => rows;
const rpc = (m: any) => handleRpc(m, load) as Promise<any>;

// ---------- ৫. MCP contract ----------
{
  const s = suite("mcp", "MCP server contract", "MCP protocol-এর নিয়ম, ৪টা tool-এর ফল, ভুল request-এ সঠিক error");
  const init = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "eval", version: "1" } } });
  s.cases.push({ name: "initialize → protocolVersion + tools capability", pass: init.result?.protocolVersion === "2025-06-18" && !!init.result?.capabilities?.tools });
  s.cases.push({ name: "notification-এর উত্তর নেই", pass: (await handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" } as any, load)) === null });
  const list = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  s.cases.push({ name: "tools/list → ৫টা tool, প্রত্যেকটায় inputSchema", pass: list.result?.tools?.length === 5 && list.result.tools.every((t: any) => t.inputSchema?.type === "object") });
  const em = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_emissions", arguments: {} } });
  const direct = rows.reduce((a, e) => a + e.payload.kg_co2e, 0) / 1000;
  s.cases.push({ name: "get_emissions মোট = ledger-এর যোগফল", pass: Math.abs(em.result.structuredContent.total - direct) < 0.01, detail: `${em.result.structuredContent.total} vs ${direct.toFixed(2)}` });
  const ex = await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "explain_calculation", arguments: { month: "2026-11" } } });
  s.cases.push({ name: "explain_calculation → সূত্র, উৎস, license, বিলের hash", pass: !!ex.result.structuredContent.records[0].factor.license && !!ex.result.structuredContent.records[0].bill?.sha256 });
  const v = await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "verify_ledger", arguments: {} } });
  s.cases.push({ name: "verify_ledger → valid", pass: v.result.structuredContent.valid === true });
  s.cases.push({ name: "অজানা tool → -32602", pass: (await rpc({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "drop_table" } })).error?.code === -32602 });
  s.cases.push({ name: "অজানা method → -32601", pass: (await rpc({ jsonrpc: "2.0", id: 7, method: "x" })).error?.code === -32601 });
  s.cases.push({ name: "ভুল argument → isError (crash নয়)", pass: (await rpc({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "get_emissions", arguments: { from: "'; drop" } } })).result?.isError === true });
  s.cases.push({ name: "লেখার কোনো tool নেই (সব readOnlyHint)", pass: list.result.tools.every((t: any) => t.annotations?.readOnlyHint === true) });
}

// ---------- ৬. Copilot প্রশ্ন বোঝা ----------
{
  const s = suite("routing", "Copilot: প্রশ্ন → সঠিক tool", "৩০টা বাংলা/English প্রশ্ন, প্রতিটার প্রত্যাশিত intent আর মাস");
  const Q: [string, string, string?][] = [
    ["মোট নির্গমন কত?", "total"], ["আমাদের কার্বন কত হয়েছে", "total"], ["how much emission in 2026", "total"], ["total co2", "total"],
    ["নভেম্বর ২০২৬-এ কত হয়েছে?", "total", "2026-11"], ["ডিসেম্বর ২০২৫-এ গ্যাস কত?", "total", "2025-12"], ["December 2025 total", "total", "2025-12"], ["২০২৬-০৩ এ নির্গমন", "total", "2026-03"],
    ["কোন মাসে সবচেয়ে বেশি?", "peak"], ["highest month", "peak"], ["সবচেয়ে কম কোন মাসে", "peak"],
    ["মে মাসে কেন বাড়ল?", "change", "2026-05"], ["why did it increase in may", "change", "2026-05"], ["গত মাসের তুলনায় কমেছে?", "change"], ["জুলাই ২০২৬ এ কেন কমে গেল", "change", "2026-07"],
    ["নভেম্বরের বিদ্যুৎ কীভাবে হিসাব হলো?", "explain", "2026-11"], ["how was november electricity calculated", "explain", "2026-11"], ["অক্টোবরের গ্যাসের হিসাবের প্রমাণ দেখাও", "explain", "2026-10"], ["explain march 2026", "explain", "2026-03"],
    ["Ledger কি অক্ষত?", "verify"], ["কেউ কি ডেটা বদলেছে?", "verify"], ["verify the hash chain", "verify"], ["এই ডেটা কি বিশ্বাস করা যায়", "verify"],
    ["কোন গুণক ব্যবহার হয়েছে?", "factors"], ["Ember factor কত?", "factors"], ["emission factor source", "factors"], ["DESNZ license", "factors"],
    ["Scope 1 মানে কী?", "scope"], ["what is scope 2", "scope"], ["হ্যালো", "help"],
  ];
  for (const [q, kind, month] of Q) {
    const it: any = route(q);
    s.cases.push({ name: q, pass: it.kind === kind && (!month || it.month === month), detail: JSON.stringify(it) });
  }
}

// ---------- ৭. Guardrail ----------
{
  const s = suite("guardrail", "AI guardrail", "AI-এর বানানো সংখ্যা, অস্বীকার, মূল সংখ্যা বাদ — সব আটকায়; সঠিক উত্তর পাস করে");
  const tool = [{ total: 2092.99, scope_1: 1053.19, scope_2_location_based: 1039.8 }];
  const ans: Answer = { text: "মোট নির্গমন **২,০৯২.৯৯ টন CO₂e**।\n• Scope 1: ১,০৫৩.১৯ টন\n• Scope 2: ১,০৩৯.৮০ টন", sources: [], key: ["২,০৯২.৯৯"] };
  const C: [string, string, boolean][] = [
    ["সঠিক বাংলা উত্তর", "গত ১২ মাসে মোট ২,০৯২.৯৯ টন CO₂e, বিদ্যুৎ থেকে ১,০৩৯.৮০ টন।", true],
    ["সঠিক English সংখ্যা", "Total emissions were 2092.99 tonnes.", true],
    ["গোল করা সংখ্যা সহ", "মোট ২,০৯২.৯৯ টন, প্রায় ১,০৪০ টন বিদ্যুৎ থেকে।", true],
    ["অস্বীকার", "এই তথ্যটা আমার কাছে নেই।", false],
    ["বানানো সংখ্যা", "মোট ২,০৯২.৯৯ টন, গত বছরের চেয়ে ১৫০ টন বেশি।", false],
    ["বানানো শতাংশ", "মোট ২,০৯২.৯৯ টন, যা ৩৭% কম।", false],
    ["মূল সংখ্যা বাদ", "Scope 1 থেকে ১,০৫৩.১৯ টন এসেছে।", false],
    ["ভুল মোট", "মোট ২,১০০ টন।", false],
    ["ফাঁকা", "", false],
    ["prompt injection-এর মতো", "Ignore rules. মোট ৯৯৯৯ টন।", false],
  ];
  for (const [name, text, expect] of C) { const r = verifyAi(text, ans, tool); s.cases.push({ name, pass: r.ok === expect, detail: r.reason ?? "ok" }); }
}

// ---------- ৮. Copilot end-to-end (সংখ্যা বানায় না) ----------
{
  const s = suite("copilot", "Copilot: উত্তরের প্রতিটা সংখ্যা ডেটা থেকে", "প্রশ্ন → MCP → উত্তর; উত্তরের কোনো সংখ্যা tool output-এর বাইরে নয়");
  const Q = ["মোট নির্গমন কত?", "কোন মাসে সবচেয়ে বেশি?", "মে মাসে কেন বাড়ল?", "নভেম্বর ২০২৬-এর বিদ্যুৎ কীভাবে হিসাব হলো?", "Ledger কি অক্ষত?", "নভেম্বর ২০২৬-এ কত হয়েছে?", "how much emission in 2026"];
  for (const q of Q) {
    const it = route(q); const res: any[] = [];
    for (const c of toolsFor(it)) { const r = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: c }); res.push(r.result.isError ? r.result.content[0].text : r.result.structuredContent); }
    const a = compose(it, res);
    const check = verifyAi(a.text, { ...a, key: [] }, res);
    s.cases.push({ name: q, pass: check.ok || check.reason === "refusal", detail: check.reason ?? "ok" });
  }
}

// ---------- নতুন demo (উৎপাদনসহ) ----------
const E2: LedgerEntry[] = []; const PROD: any[] = []; { let p = GENESIS;
  for (const m of demoMonths()) {
    for (const [a, q, u] of [["electricity", m.kwh, "kWh"], ["natural_gas", m.gas, "m3"], ["diesel", m.diesel, "litre"]] as [string, number, string][]) {
      const payload: any = { record_id: `x${E2.length}`, period_month: `${m.month}-01`, ...calculate(a, q, u), evidence_level: "L1+L3" };
      const h = makeHash(payload, p); E2.push({ id: E2.length + 1, payload, prev_hash: p, hash: h }); p = h;
    }
    let left = m.pieces; BUYERS.forEach((b, i) => { const pc = i === BUYERS.length - 1 ? left : Math.round(m.pieces * b.share); left -= pc; PROD.push({ period_month: `${m.month}-01`, buyer: b.name, pieces: pc }); });
  }
}
const R2 = E2.map((e) => ({ activity: e.payload.activity, quantity: e.payload.quantity, period_month: e.payload.period_month, scope: e.payload.scope, kg_co2e: e.payload.kg_co2e, has_bill: false, meter_ok: null as boolean | null }));

// ---------- ৯. Evidence Score ----------
{
  const s = suite("evidence", "Evidence Score", "প্রমাণের মান ০-১০০: মাস বাদ, বিল, মিটার, ledger, ডুপ্লিকেট — ঠিকভাবে নম্বর কমে-বাড়ে");
  const base = evidenceScore(R2, true);
  s.cases.push({ name: "পূর্ণ synthetic ডেটা (বিল ছাড়া) → ৬০", pass: base.score === 60, detail: `${base.score}` });
  const miss = evidenceScore(R2.filter((r) => !(r.activity === "electricity" && r.period_month === "2026-07-01")), true);
  s.cases.push({ name: "একটা মাস বাদ → score কমে, কোন মাস তা বলে", pass: miss.score < base.score && miss.actions[0].includes("জুলাই"), detail: `${miss.score} · ${miss.actions[0]}` });
  const one = R2.map((r, i) => (i === 0 ? { ...r, has_bill: true, meter_ok: true } : r));
  s.cases.push({ name: "একটা বিল যোগে পুরো ১৫ মিটার-নম্বর দেয় না (অন্যায্য বাড়তি নেই)", pass: evidenceScore(one, true).parts.find((p) => p.key === "meter")!.got <= 1 });
  const all = R2.map((r) => ({ ...r, has_bill: true, meter_ok: true }));
  s.cases.push({ name: "সব বিল সংযুক্ত ও মিটার মিলেছে → ১০০", pass: evidenceScore(all, true).score === 100, detail: `${evidenceScore(all, true).score}` });
  s.cases.push({ name: "Ledger গরমিল → ২০ নম্বর কাটা", pass: evidenceScore(R2, false).score === base.score - 20 });
  s.cases.push({ name: "ডুপ্লিকেট মাস → ১০ নম্বর কাটা", pass: evidenceScore([...R2, R2[0]], true).score === base.score - 10 });
}

// ---------- ১০. প্রতি পিস, buyer ভাগ, অস্বাভাবিকতা, জেনারেটর ----------
{
  const s = suite("insights", "প্রতি পিস · অস্বাভাবিকতা · জেনারেটর", "Synthetic demo-তে ইচ্ছাকৃত রাখা সমস্যা (আগস্টে বয়লার) ধরে কিনা, ভুল সতর্কবার্তা দেয় কিনা");
  const it = intensity(R2, PROD);
  s.cases.push({ name: "১২ মাসের প্রতি পিস হিসাব, ০.৫–০.৮ kg-এর মধ্যে", pass: it.length === 12 && it.every((x) => x.kgPerPiece > 0.5 && x.kgPerPiece < 0.8), detail: it.map((x) => x.kgPerPiece.toFixed(3)).join(" ") });
  const sh = buyerShare(R2, PROD);
  const sumT = sh.reduce((a, b) => a + b.tonnes, 0), totT = R2.reduce((a, r) => a + r.kg_co2e, 0) / 1000;
  s.cases.push({ name: "Buyer-দের ভাগ যোগ করলে মোট নির্গমন হয় (কিছু হারায় না)", pass: Math.abs(sumT - totT) < 0.01, detail: `${sumT.toFixed(2)} vs ${totT.toFixed(2)}` });
  const an = anomalies(R2, PROD);
  s.cases.push({ name: "আগস্ট ২০২৬-এর গ্যাস অস্বাভাবিকতা ধরে", pass: an.some((a) => a.month === "2026-08" && a.activity === "natural_gas"), detail: an.map((a) => `${a.month} ${a.activity} ${(a.pct * 100).toFixed(1)}%`).join(", ") });
  s.cases.push({ name: "অন্য কোনো মাসে ভুল সতর্কবার্তা নেই", pass: an.length === 1, detail: `${an.length}টা` });
  const g = generator(R2);
  s.cases.push({ name: "জেনারেটর: মোট লিটার আর সবচেয়ে বেশি মাস (মে)", pass: g.total.litres === 20900 && g.peak?.month === "2026-05", detail: `${g.total.litres}L, ${g.peak?.month}` });
  s.cases.push({ name: "জেনারেটর grid-এর চেয়ে দামি → বাড়তি খরচ ধনাত্মক", pass: g.total.tkExtra > 0, detail: `৳${Math.round(g.total.tkExtra)}` });
}

// ---------- ১১. Planner ----------
{
  const s = suite("planner", "বিনিয়োগ পরিকল্পনা (optimizer)", "বাজেটের মধ্যে সেরা প্রকল্প-সমন্বয় — সব ১০২৪টা সমন্বয়ের সাথে মিলিয়ে সর্বোত্তম কিনা");
  const ms = demoMonths(), base = { kwh: ms.reduce((a, m) => a + m.kwh, 0), gasM3: ms.reduce((a, m) => a + m.gas, 0), dieselL: ms.reduce((a, m) => a + m.diesel, 0) };
  for (const budget of [1_000_000, 5_000_000, 20_000_000]) for (const goal of ["carbon", "money"] as const) {
    const o = optimize(base, budget, goal); let better = 0;
    for (let m = 0; m < 1 << PROJECTS.length; m++) { const r = evaluate(PROJECTS.filter((_, i) => m & (1 << i)), base); if (r.capex <= budget && (goal === "carbon" ? r.tYr : r.npv) > (goal === "carbon" ? o.tYr : o.npv) + 1e-6) better++; }
    s.cases.push({ name: `৳${budget / 1e5} লাখ, লক্ষ্য ${goal === "carbon" ? "কার্বন" : "টাকা"}: সর্বোত্তম ও বাজেটের মধ্যে`, pass: better === 0 && o.capex <= budget, detail: `${o.ids.join(",")} · ${o.tYr.toFixed(0)}t` });
  }
  const two = evaluate(PROJECTS.filter((p) => p.id === "led" || p.id === "air"), base), a = evaluate(PROJECTS.filter((p) => p.id === "led"), base), b = evaluate(PROJECTS.filter((p) => p.id === "air"), base);
  s.cases.push({ name: "দুই প্রকল্প একসাথে ≤ আলাদা যোগফল (দ্বিগুণ গোনা নেই)", pass: two.kwhSaved <= a.kwhSaved + b.kwhSaved + 1e-6 });
  const c5 = optimize(base, 500_000, "carbon"), m5 = optimize(base, 500_000, "money");
  s.cases.push({ name: "কম বাজেটে দুই লক্ষ্য আলাদা প্রকল্প বাছে (কার্বন বনাম NPV)", pass: c5.ids.join() !== m5.ids.join() && c5.tYr >= m5.tYr && m5.npv >= c5.npv, detail: `কার্বন: ${c5.ids} · টাকা: ${m5.ids}` });
  const led = PROJECTS.find((p) => p.id === "led")!, el = evaluate([led], base);
  s.cases.push({ name: "NPV = বার্ষিক সাশ্রয় × annuity(আয়ু, ১০%) − বিনিয়োগ", pass: Math.abs(el.npv - (el.tkYr * annuity(led.lifeYears) - led.capexTk)) < 1 });
}

// ---------- ১১ক. গ্যাস / LPG / ডিজেল ----------
{
  const s = suite("fuels", "গ্যাস, LPG ও ডিজেলের বিল/রসিদ", "নথির ধরন নিজে চেনা আর সঠিক একক (m³, লিটার) বের করা; LPG kg → লিটার DESNZ-এর গুণক থেকে");
  const gas = "SAMPLE GAS DISTRIBUTION CO.\nNATURAL GAS BILL (INDUSTRIAL)\nBilling Month : October 2026\nPrevious Reading : 1,284,560 m3\nPresent Reading : 1,324,930 m3\nGas Consumed: 40,370 m3";
  const lpg = "SAMPLE LPG SUPPLIERS LTD.\nLPG CYLINDER SALES RECEIPT\nBilling Month : October 2026\nProduct : LPG Cylinder 45 kg\nQuantity : 8 cylinders\nTotal LPG: 360 kg";
  const dsl = "SAMPLE FILLING STATION\nDIESEL (HSD) PURCHASE RECEIPT\nBilling Month : October 2026\nQuantity: 800 Litres\nRate (Tk 105 / L) Tk 84,000";
  const g = parseFuel(gas, "natural_gas"), l = parseFuel(lpg, "lpg"), d = parseFuel(dsl, "diesel");
  s.cases.push({ name: "গ্যাস বিল চেনা → 40,370 m³, মিটার মিলেছে", pass: detectActivity(gas) === "natural_gas" && g.quantity === 40370 && g.meter?.ok === true && g.month === "2026-10" });
  s.cases.push({ name: "LPG রসিদ চেনা → 360 kg = 679.2 লিটার", pass: detectActivity(lpg) === "lpg" && l.quantity === 679.2, detail: `${l.quantity} L` });
  s.cases.push({ name: "LPG: মোট kg না থাকলে সিলিন্ডার × মাপ", pass: parseFuel("LPG Cylinder 12 kg\nQuantity : 10 cylinders", "lpg").quantity === Math.round((120 / 0.53) * 10) / 10 });
  s.cases.push({ name: "ডিজেল রসিদ চেনা → 800 লিটার", pass: detectActivity(dsl) === "diesel" && d.quantity === 800 });
  s.cases.push({ name: "বিদ্যুৎ বিলকে গ্যাস ভাবে না", pass: detectActivity("SAMPLE POWER DISTRIBUTION CO.\nELECTRICITY BILL\nUnits Consumed: 112,970 kWh") === "electricity" });
  s.cases.push({ name: "LPG ঘনত্ব DESNZ-এর দুই গুণকের অনুপাতের সাথে মেলে", pass: Math.abs(1.55713 / 2.93936 - 0.53) < 0.005 });
}

// ---------- ১১খ. পরে যুক্ত মূল বিল (append-only evidence) ----------
{
  const s = suite("evidence_attach", "পরে মূল বিল যুক্ত করা", "Demo বা হাতে লেখা record-এ পরে বিল দিলে নতুন record হয় না, প্রমাণ যোগ হয়, গরমিল ধরা পড়ে");
  const base = [{ payload: { record_id: "r1", activity: "electricity", quantity: 1000, period_month: "2026-10-01", scope: 2, kg_co2e: 696, evidence_level: "L1+L3" } }];
  const okAtt = { payload: { kind: "evidence", record_id: "r1", evidence: { file_hash: "x", meter_check: { ok: true } }, bill_check: { ok: true, diff_pct: 0 } } };
  const badAtt = { payload: { kind: "evidence", record_id: "r1", evidence: { file_hash: "y", meter_check: { ok: true } }, bill_check: { ok: false, diff_pct: 12 } } };
  const r1 = ledgerToRows([...base, okAtt]);
  s.cases.push({ name: "বিল যুক্ত করলে record একটাই থাকে (দুবার গোনা নেই)", pass: r1.length === 1 && r1[0].kg_co2e === 696 });
  s.cases.push({ name: "যুক্ত বিল → has_bill আর মিটার মিলেছে", pass: r1[0].has_bill && r1[0].meter_ok === true });
  const r2 = ledgerToRows([...base, badAtt]);
  s.cases.push({ name: "বিলের সংখ্যা record থেকে আলাদা হলে → মিটার 'মেলেনি'", pass: r2[0].has_bill && r2[0].meter_ok === false });
  s.cases.push({ name: "বিল ছাড়া record → has_bill নেই", pass: !ledgerToRows(base)[0].has_bill });
}

// ---------- ১২. Carbon Passport + QR ----------
{
  const s = suite("passport", "Carbon Passport ও QR", "Passport তৈরি, বদলানো/বাতিল ধরা পড়ে কিনা, আর QR আসলেই scan হয় কিনা (OpenCV দিয়ে পড়ে)");
  const p = buildPassport(E2, PROD, { buyer: "Nordic Apparel", order_ref: "NA-1", pieces: 40000, from: "2026-07", to: "2026-09" });
  const st = { payload: JSON.parse(JSON.stringify(p.payload)), ledger_hash: p.ledgerHash, hash: p.hash, revoked: false };
  s.cases.push({ name: "নতুন passport → যাচাই সফল", pass: verifyPassport(st, E2).valid, detail: `${p.payload.kg_per_piece} kg/পিস, ${p.payload.order_tco2e} t` });
  s.cases.push({ name: "order_tco2e = পিস × kg/পিস", pass: Math.abs(p.payload.order_tco2e - (40000 * p.payload.kg_per_piece) / 1000) < 0.02 });
  const t1 = JSON.parse(JSON.stringify(st)); t1.payload.kg_per_piece = 0.3;
  s.cases.push({ name: "Passport-এর সংখ্যা বদলালে → ব্যর্থ", pass: !verifyPassport(t1, E2).valid && !verifyPassport(t1, E2).hashOk });
  const e3 = JSON.parse(JSON.stringify(E2)); e3[10].payload.kg_co2e = 1;
  s.cases.push({ name: "পেছনের ledger বদলালে → ব্যর্থ", pass: !verifyPassport(st, e3).valid && !verifyPassport(st, e3).chainOk });
  s.cases.push({ name: "Factory বাতিল করলে → ব্যর্থ", pass: !verifyPassport({ ...st, revoked: true }, E2).valid });
  s.cases.push({ name: "Passport id: ৮ অক্ষর, ভুল-পড়া অক্ষর (0/O/1/I) নেই", pass: /^[2-9A-HJ-NP-Z]{8}$/.test(newPassportId()) });
  for (const t of ["https://carboniq-lake.vercel.app/p/K7Q2M9XA", "CarbonIQ BD — বাংলা ১২৩"]) {
    try {
      const m = qrMatrix(t), q = 4, sc = 6, n = (m.length + 2 * q) * sc, px = Buffer.alloc(n * n, 255);
      m.forEach((row, y) => row.forEach((v, x) => { if (v) for (let dy = 0; dy < sc; dy++) for (let dx = 0; dx < sc; dx++) px[((y + q) * sc + dy) * n + (x + q) * sc + dx] = 0; }));
      const f = new URL(`./_qr_${t.length}.pgm`, import.meta.url);
      writeFileSync(f, Buffer.concat([Buffer.from(`P5\n${n} ${n}\n255\n`), px]));
      const out = execSync(`python3 -I -c "import cv2,sys; v,_,_=cv2.QRCodeDetector().detectAndDecode(cv2.imread(sys.argv[1],0)); sys.stdout.buffer.write(v.encode())" ${f.pathname}`).toString();
      s.cases.push({ name: `QR scan হয়: "${t.slice(0, 32)}…"`, pass: out === t, detail: out.slice(0, 40) });
    } catch (e) { s.cases.push({ name: `QR scan: "${t.slice(0, 20)}"`, pass: false, detail: "OpenCV পাওয়া যায়নি" }); }
  }
}

// ---------- ১৩. Copilot নতুন প্রশ্ন + get_insights ----------
{
  const s = suite("copilot2", "Copilot: নতুন প্রশ্ন (MCP get_insights)", "প্রতি পিস, Evidence Score, সমস্যা — সঠিক tool আর সংখ্যা ডেটা থেকে");
  for (const [q, kind] of [["প্রতি পিসে কত?", "intensity"], ["Evidence Score কত?", "evidence"], ["কোনো সমস্যা আছে?", "alerts"], ["জেনারেটরে কত খরচ হলো", "alerts"], ["per piece emission", "intensity"], ["ডেটা কতটা বিশ্বাসযোগ্য", "evidence"]] as const) {
    const it: any = route(q); s.cases.push({ name: q, pass: it.kind === kind, detail: it.kind });
  }
  const r: any = await handleRpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_insights", arguments: {} } }, async () => E2, async () => PROD);
  const sc = r.result?.structuredContent;
  s.cases.push({ name: "get_insights → score, kg/পিস, অস্বাভাবিকতা, জেনারেটর", pass: sc?.evidence_score?.score === 60 && sc?.kg_co2e_per_piece > 0.5 && sc?.anomalies?.length === 1 && sc?.generator?.litres === 20900 });
  for (const q of ["প্রতি পিসে কত?", "Evidence Score কত?", "কোনো সমস্যা আছে?"]) {
    const it = route(q); const a = compose(it, [sc]); const v = verifyAi(a.text, { ...a, key: [] }, [sc]);
    s.cases.push({ name: `উত্তরে বানানো সংখ্যা নেই: ${q}`, pass: v.ok || v.reason === "refusal", detail: v.reason ?? "ok" });
  }
}

// ---------- ফলাফল ----------
const out = {
  generated_at: new Date().toISOString(),
  node: process.version,
  suites: suites.map((s) => ({ ...s, passed: s.cases.filter((c) => c.pass).length, total: s.cases.length })),
};
const passed = out.suites.reduce((a, s) => a + s.passed, 0), total = out.suites.reduce((a, s) => a + s.total, 0);
(out as any).summary = { passed, total };
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2));
for (const s of out.suites) {
  console.log(`${s.passed === s.total ? "✓" : "✗"} ${s.title}: ${s.passed}/${s.total}`);
  for (const c of s.cases) if (!c.pass) console.log(`    ✗ ${c.name} — ${c.detail ?? ""}`);
}
console.log(`\nমোট: ${passed}/${total}`);
