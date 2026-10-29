// CarbonIQ MCP server — Model Context Protocol (JSON-RPC 2.0, Streamable HTTP, stateless)
// কোনো বাইরের package নেই। ডেটা আসে বাইরে থেকে (LedgerSource), তাই এই ফাইল আলাদাভাবে পরীক্ষা করা যায়।
import { FACTORS } from "./factors";
import { verifyChain } from "./ledger";
import { anomalies, evidenceScore, generator, intensity, type InProd } from "./insights";
import { ledgerToRows, foldEvidence, meterOk } from "./passportRows";

export type LedgerEntry = { id: number | string; payload: Record<string, any>; prev_hash: string; hash: string };
export type LedgerSource = () => Promise<LedgerEntry[]>;
export type ProductionSource = () => Promise<InProd[]>;

export const SERVER_INFO = { name: "carboniq-bd", title: "CarbonIQ BD", version: "0.2.0" };
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

const MONTH = { type: "string", pattern: "^\\d{4}-\\d{2}$", description: "মাস, YYYY-MM (যেমন 2026-07)" };

export const TOOLS = [
  {
    name: "get_emissions",
    title: "নির্গমনের হিসাব",
    description: "Demo factory-র scope 1 ও 2 নির্গমন (tCO2e), সময়কাল অনুযায়ী। মাসভিত্তিক ভাগ, প্রমাণের স্তর আর ledger-এর অবস্থাসহ। সব সংখ্যা hash-সিল করা ledger থেকে।",
    inputSchema: {
      type: "object",
      properties: {
        from: { ...MONTH, description: "শুরুর মাস (YYYY-MM), না দিলে শুরু থেকে" },
        to: { ...MONTH, description: "শেষ মাস (YYYY-MM), না দিলে শেষ পর্যন্ত" },
        group_by: { type: "string", enum: ["month", "total"], default: "month" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "explain_calculation",
    title: "একটা হিসাবের ব্যাখ্যা",
    description: "একটা record-এর পুরো প্রমাণ: সূত্র, পরিমাণ, গুণক, গুণকের উৎস ও license, বিলের SHA-256, মিটার যাচাই, ledger hash। record_id অথবা month (+activity) দিন।",
    inputSchema: {
      type: "object",
      properties: {
        record_id: { type: "string" },
        month: MONTH,
        activity: { type: "string", enum: ["electricity", "natural_gas", "diesel", "lpg"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "verify_ledger",
    title: "Ledger যাচাই",
    description: "পুরো SHA-256 hash chain আবার হিসাব করে দেখে কোনো record পরে বদলানো হয়েছে কিনা।",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_insights",
    title: "বুদ্ধিমত্তা ও প্রমাণের মান",
    description: "Evidence Score (০-১০০, CarbonIQ-এর নিজস্ব মান-নির্দেশক), প্রতি পিস নির্গমন (kg CO2e), প্রত্যাশার চেয়ে অস্বাভাবিক বেশি ব্যবহারের মাস (৳ ক্ষতিসহ, আনুমানিক) আর ডিজেল জেনারেটরের বাড়তি খরচ।",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_factors",
    title: "নির্গমন গুণক",
    description: "ব্যবহৃত সব নির্গমন গুণক: মান, একক, scope, উৎস, license, বছর, version।",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const r2 = (n: number) => Math.round(n * 100) / 100;
const monthOf = (p: Record<string, any>) => String(p.period_month).slice(0, 7);

class ToolError extends Error {}

function getEmissions(rows: LedgerEntry[], args: any) {
  const from = args?.from, to = args?.to;
  for (const m of [from, to]) if (m !== undefined && !/^\d{4}-\d{2}$/.test(m)) throw new ToolError(`মাসের ধরন ভুল: ${m} (YYYY-MM দিন)`);
  const sel = foldEvidence(rows).filter((e) => (!from || monthOf(e.payload) >= from) && (!to || monthOf(e.payload) <= to));
  const sum = (xs: LedgerEntry[], s?: number) => r2(xs.filter((e) => !s || e.payload.scope === s).reduce((a, e) => a + Number(e.payload.kg_co2e), 0) / 1000);
  const months = Array.from(new Set(sel.map((e) => monthOf(e.payload)))).sort();
  const out: Record<string, any> = {
    factory: "Demo Knit Factory, Gazipur (synthetic demo data)",
    period: { from: months[0] ?? null, to: months[months.length - 1] ?? null, months: months.length },
    unit: "tCO2e",
    total: sum(sel), scope_1: sum(sel, 1), scope_2_location_based: sum(sel, 2),
    records: sel.length,
    evidence: {
      human_confirmed_L1: sel.length,
      original_bill_attached_L2: sel.filter((e) => e.payload.evidence).length,
      meter_reading_matched: sel.filter((e) => meterOk(e.payload)).length,
      hash_sealed_L3: sel.length,
    },
    ledger_valid: verifyChain(rows),
  };
  if ((args?.group_by ?? "month") === "month") {
    out.by_month = months.map((m) => {
      const xs = sel.filter((e) => monthOf(e.payload) === m);
      return { month: m, total: sum(xs), scope_1: sum(xs, 1), scope_2: sum(xs, 2) };
    });
  }
  return out;
}

function explain(raw: LedgerEntry[], args: any) {
  const rows = foldEvidence(raw);
  let hits = rows;
  if (args?.record_id) hits = rows.filter((e) => e.payload.record_id === args.record_id);
  else if (args?.month) hits = rows.filter((e) => monthOf(e.payload) === args.month && (!args.activity || e.payload.activity === args.activity));
  else throw new ToolError("record_id অথবা month দিন");
  if (!hits.length) throw new ToolError("কোনো record পাওয়া যায়নি");
  return {
    records: hits.slice(0, 10).map((e) => {
      const p = e.payload;
      const f = FACTORS.find((x) => x.activity === p.activity && x.unit === p.unit);
      return {
        record_id: p.record_id, month: monthOf(p), activity: p.activity, scope: p.scope,
        quantity: p.quantity, unit: p.unit,
        formula: p.formula, result_kg_co2e: p.kg_co2e, result_t_co2e: r2(Number(p.kg_co2e) / 1000),
        factor: { value: p.factor, unit: `kgCO2e/${p.unit}`, source: p.factor_source, version: p.factor_version, license: f?.license ?? null },
        evidence_level: p.evidence_level ?? "L1+L3",
        bill: p.evidence ? { sha256: p.evidence.file_hash, ocr_confidence: p.evidence.ocr_confidence ?? null, edited_after_ocr: !!p.evidence.edited_after_ocr, meter_check: p.evidence.meter_check ?? null } : null,
        ledger: { entry_id: e.id, hash: e.hash, prev_hash: e.prev_hash },
        note: p.evidence ? undefined : "Synthetic demo record — মূল বিল নেই",
      };
    }),
    more: Math.max(0, hits.length - 10),
  };
}

type RpcReq = { jsonrpc?: string; id?: string | number | null; method?: string; params?: any };

const ok = (id: any, result: any) => ({ jsonrpc: "2.0", id, result });
const fail = (id: any, code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const content = (data: any, isError = false) => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
  ...(typeof data === "object" && !isError ? { structuredContent: data } : {}),
  isError,
});

/** একটা JSON-RPC message → উত্তর (notification হলে null) */
export async function handleRpc(msg: RpcReq, load: LedgerSource, loadProd: ProductionSource = async () => []): Promise<object | null> {
  const isNotification = msg.id === undefined;
  if (msg?.jsonrpc !== "2.0" || typeof msg.method !== "string") return isNotification ? null : fail(msg?.id, -32600, "Invalid Request");
  if (isNotification) return null; // যেমন notifications/initialized

  switch (msg.method) {
    case "initialize": {
      const asked = msg.params?.protocolVersion;
      return ok(msg.id, {
        protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: "CarbonIQ BD: বাংলাদেশের garment factory-র প্রমাণসহ কার্বন হিসাব। সব tool read-only। সংখ্যা উদ্ধৃত করার সময় explain_calculation দিয়ে উৎস দেখান। Demo factory-র ডেটা synthetic।",
      });
    }
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, { tools: TOOLS });
    case "tools/call": {
      const name = msg.params?.name, args = msg.params?.arguments ?? {};
      if (!TOOLS.some((t) => t.name === name)) return fail(msg.id, -32602, `Unknown tool: ${name}`);
      try {
        if (name === "get_factors") return ok(msg.id, content({ factors: FACTORS }));
        const rows = await load();
        if (name === "get_emissions") return ok(msg.id, content(getEmissions(rows, args)));
        if (name === "explain_calculation") return ok(msg.id, content(explain(rows, args)));
        if (name === "get_insights") {
          const rr = ledgerToRows(rows), prod = await loadProd(), valid = verifyChain(rows);
          const ev = evidenceScore(rr, valid), it = intensity(rr, prod), g = generator(rr);
          const kgpp = it.length ? it.reduce((a, x) => a + x.tonnes * 1000, 0) / it.reduce((a, x) => a + x.pieces, 0) : null;
          return ok(msg.id, content({
            evidence_score: { score: ev.score, grade: ev.grade, parts: ev.parts.map((p) => ({ part: p.label, got: p.got, max: p.max })), improve: ev.actions, note: "CarbonIQ-এর নিজস্ব মান-নির্দেশক, সরকারি সনদ নয়" },
            kg_co2e_per_piece: kgpp === null ? null : Math.round(kgpp * 10000) / 10000,
            by_month_kg_per_piece: it.map((x) => ({ month: x.month, pieces: x.pieces, kg_per_piece: Math.round(x.kgPerPiece * 10000) / 10000 })),
            anomalies: anomalies(rr, prod).map((a) => ({ month: a.month, activity: a.activity, pct_above_expected: Math.round(a.pct * 1000) / 10, actual: a.actual, expected: Math.round(a.expected), est_loss_tk: Math.round(a.tkLoss), extra_tco2e: Math.round(a.extraT * 100) / 100, hint: a.detail })),
            generator: { litres: g.total.litres, est_extra_cost_tk: Math.round(g.total.tkExtra), extra_tco2e_vs_grid: Math.round(g.total.tExtra * 100) / 100, peak_month: g.peak?.month ?? null },
            assumptions: "আনুমানিক দাম: বিদ্যুৎ ৳১১/kWh, গ্যাস ৳৩০/m³, ডিজেল ৳১০৫/লিটার",
          }));
        }
        if (name === "verify_ledger") {
          return ok(msg.id, content({ entries: rows.length, valid: verifyChain(rows), last_hash: rows.at(-1)?.hash ?? null, algorithm: "SHA-256 hash chain, append-only" }));
        }
      } catch (e) {
        if (e instanceof ToolError) return ok(msg.id, content(e.message, true));
        return fail(msg.id, -32603, "Internal error");
      }
      return fail(msg.id, -32601, "Method not found");
    }
    default:
      return fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}
