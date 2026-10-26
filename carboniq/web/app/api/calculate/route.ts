import { calculate } from "@/lib/engine";
import { GENESIS, makeHash } from "@/lib/ledger";
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { activity, quantity, unit, month } = await req.json();
    if (!/^\d{4}-\d{2}$/.test(month || "")) throw new Error("মাস দিন (YYYY-MM)");
    const result = calculate(activity, Number(quantity), unit);
    const supa = db();

    const { data: rec, error: e1 } = await supa.from("activity_records").insert({
      org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, activity, quantity: result.quantity, unit,
      period_month: `${month}-01`, status: "confirmed", confirmed_by: "demo-user", confirmed_at: new Date().toISOString(),
    }).select().single();
    if (e1) throw e1;

    const { data: last } = await supa.from("ledger_entries").select("hash")
      .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: false }).limit(1).maybeSingle();
    const prev = last?.hash ?? GENESIS;
    const payload = { record_id: rec.id, period_month: rec.period_month, ...result };
    const hash = makeHash(payload, prev);

    const { error: e2 } = await supa.from("ledger_entries").insert({
      org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, record_id: rec.id, payload, prev_hash: prev, hash,
    });
    if (e2) throw e2;

    return Response.json({ ...result, record_id: rec.id, ledger_hash: hash });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "সমস্যা";
    return Response.json({ error: msg }, { status: 400 });
  }
}
