// CSV export: buyer বা auditor-এর জন্য প্রতিটা record — পরিমাণ, গুণক, উৎস, প্রমাণের স্তর, hash
import { errMsg } from "@/lib/record";
import { loadLedger } from "@/lib/ledgerData";
import { foldEvidence, meterOk } from "@/lib/passportRows";
import { verifyChain } from "@/lib/ledger";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
const esc = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function GET(req: Request) {
  try {
    if (!rateLimit("export:" + clientKey(req), 20).ok) return new Response("Rate limit", { status: 429 });
    const raw = await loadLedger(), valid = verifyChain(raw);
    const rows = foldEvidence(raw).map((e) => e.payload);
    const head = ["month", "activity", "quantity", "unit", "scope", "factor_kg_per_unit", "factor_source", "factor_version", "kg_co2e", "evidence_level", "original_bill", "meter_check", "bill_sha256", "record_id"];
    const lines = rows.map((p) => [String(p.period_month).slice(0, 7), p.activity, p.quantity, p.unit, p.scope, p.factor, p.factor_source, p.factor_version, p.kg_co2e, p.evidence_level ?? "L1+L3", p.evidence ? "yes" : "no", meterOk(p) === null ? "" : meterOk(p) ? "matched" : "mismatch", p.evidence?.file_hash ?? "", p.record_id].map(esc).join(","));
    const meta = [`# CarbonIQ BD export — Demo Knit Factory (synthetic demo data)`, `# generated ${new Date().toISOString()} · ledger entries ${raw.length} · hash chain ${valid ? "VALID" : "INVALID"} · last hash ${raw.at(-1)?.hash ?? ""}`, `# method: GHG Protocol; Scope 2 location-based; kg_co2e = quantity × factor`];
    const csv = "﻿" + [...meta, head.join(","), ...lines].join("\n");
    return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="carboniq-records-${new Date().toISOString().slice(0, 10)}.csv"` } });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 500 });
  }
}
