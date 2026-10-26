import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await db().from("ledger_entries").select("id, payload, hash")
      .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: true });
    if (error) throw error;
    const records = (data ?? []).map((e) => ({
      id: String(e.id), hash: e.hash,
      activity: e.payload.activity, quantity: e.payload.quantity, unit: e.payload.unit,
      period_month: e.payload.period_month, scope: e.payload.scope, kg_co2e: e.payload.kg_co2e,
    }));
    return Response.json({ records });
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
