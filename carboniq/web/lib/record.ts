// একটা নিশ্চিত record → হিসাব → ledger-এ সিল। upload আর demo seed দুটোই এটা ব্যবহার করে।
import { calculate } from "./engine";
import { GENESIS, makeHash } from "./ledger";
import { db } from "./supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "./demo";

export async function saveConfirmed(activity: string, quantity: number, unit: string, month: string, by = "demo-user") {
  if (!/^\d{4}-\d{2}$/.test(month || "")) throw new Error("মাস দিন (YYYY-MM)");
  const result = calculate(activity, quantity, unit);
  const supa = db();
  const period = `${month}-01`;

  const { data: dup } = await supa.from("activity_records").select("id")
    .eq("factory_id", DEMO_FACTORY_ID).eq("activity", activity).eq("period_month", period).eq("status", "confirmed").limit(1);
  if (dup && dup.length) throw new Error(`এই মাসের (${month}) ${activity} আগেই নিশ্চিত করা হয়েছে — দুবার গোনা হবে না`);

  const { data: rec, error: e1 } = await supa.from("activity_records").insert({
    org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, activity, quantity: result.quantity, unit,
    period_month: period, status: "confirmed", confirmed_by: by, confirmed_at: new Date().toISOString(),
  }).select().single();
  if (e1) throw e1;

  const { data: last } = await supa.from("ledger_entries").select("hash")
    .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: false }).limit(1).maybeSingle();
  const prev = last?.hash ?? GENESIS;
  const payload = { record_id: rec.id, period_month: period, ...result };
  const hash = makeHash(payload, prev);

  const { error: e2 } = await supa.from("ledger_entries").insert({
    org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, record_id: rec.id, payload, prev_hash: prev, hash,
  });
  if (e2) throw e2;
  return { ...result, record_id: rec.id, ledger_hash: hash };
}

export function errMsg(err: unknown) {
  return err instanceof Error ? err.message : (err as { message?: string })?.message || "সমস্যা হয়েছে";
}
