import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";
import { foldEvidence, meterOk } from "@/lib/passportRows";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await db().from("ledger_entries").select("id, payload, hash")
      .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: true });
    if (error) throw error;
    const records = foldEvidence(data ?? []).map((e) => ({
      id: String(e.id), hash: e.hash,
      activity: e.payload.activity, quantity: e.payload.quantity, unit: e.payload.unit,
      period_month: e.payload.period_month, scope: e.payload.scope, kg_co2e: e.payload.kg_co2e,
      factor: e.payload.factor, factor_source: e.payload.factor_source, factor_version: e.payload.factor_version,
      record_id: e.payload.record_id, evidence_level: e.payload.evidence_level ?? "L1+L3",
      has_bill: !!e.payload.evidence, meter_ok: meterOk(e.payload), bill_check: e.payload.bill_check ?? null,
    }));
    return Response.json({ records });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 500 });
  }
}
