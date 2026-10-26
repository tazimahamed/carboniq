// Synthetic demo data: ১২ মাস (নভেম্বর ২০২৫ – অক্টোবর ২০২৬)।
// সব record আর ledger একবারে (batch) পাঠায়, তাই দ্রুত। ledger ফাঁকা থাকলে আধা-ঢোকা পুরনো demo record মুছে নতুন করে বানায়।
import { randomUUID } from "crypto";
import { calculate } from "@/lib/engine";
import { GENESIS, makeHash } from "@/lib/ledger";
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SEASON = [0.85, 0.8, 0.85, 0.95, 1.1, 1.2, 1.25, 1.2, 1.15, 1.1, 1.05, 0.95]; // গরমে বিদ্যুৎ বেশি

export async function POST() {
  try {
    const supa = db();
    const { count: sealed, error: e0 } = await supa.from("ledger_entries")
      .select("*", { count: "exact", head: true }).eq("factory_id", DEMO_FACTORY_ID);
    if (e0) throw e0;
    if ((sealed ?? 0) > 0) return Response.json({ error: "Demo factory-তে আগেই ডেটা আছে" }, { status: 400 });

    // আগের অসম্পূর্ণ চেষ্টার record (ledger-এ সিল হয়নি) মুছে ফেলা
    const { error: eDel } = await supa.from("activity_records").delete().eq("factory_id", DEMO_FACTORY_ID);
    if (eDel) throw eDel;

    const now = new Date().toISOString();
    const items: { activity: string; quantity: number; unit: string; period: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(2025, 10 + i, 1));
      const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
      items.push({ activity: "electricity", quantity: Math.round(120000 * SEASON[i]), unit: "kWh", period });
      items.push({ activity: "natural_gas", quantity: Math.round(45000 * (2 - SEASON[i])), unit: "m3", period });
      if (i % 3 === 0) items.push({ activity: "diesel", quantity: 3200, unit: "litre", period });
    }

    const records = items.map((it) => ({
      id: randomUUID(), org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID,
      activity: it.activity, quantity: it.quantity, unit: it.unit, period_month: it.period,
      status: "confirmed", confirmed_by: "demo-seed", confirmed_at: now,
    }));

    let prev = GENESIS;
    const ledger = records.map((r) => {
      const payload = { record_id: r.id, period_month: r.period_month, ...calculate(r.activity, r.quantity, r.unit) };
      const hash = makeHash(payload, prev);
      const row = { org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, record_id: r.id, payload, prev_hash: prev, hash };
      prev = hash;
      return row;
    });

    const { error: e1 } = await supa.from("activity_records").insert(records);
    if (e1) throw e1;
    const { error: e2 } = await supa.from("ledger_entries").insert(ledger); // একই ক্রমে id পায়
    if (e2) throw e2;

    return Response.json({ ok: true, months: 12, records: records.length });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 500 });
  }
}
