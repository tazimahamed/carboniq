// Synthetic demo data: ১২ মাস (নভেম্বর ২০২৫ – অক্টোবর ২০২৬), সব একবারে (batch)
import { randomUUID } from "crypto";
import { calculate } from "./engine";
import { GENESIS, makeHash } from "./ledger";
import { db } from "./supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "./demo";

const SEASON = [0.85, 0.8, 0.85, 0.95, 1.1, 1.2, 1.25, 1.2, 1.15, 1.1, 1.05, 0.95]; // গরমে বিদ্যুৎ বেশি

export async function clearDemo() {
  const supa = db();
  // মূল বিলের ছবি মুছে ফেলা: bills/<factory>/<month>/<hash>.jpg
  const { data: months } = await supa.storage.from("bills").list(DEMO_FACTORY_ID, { limit: 1000 });
  const paths: string[] = [];
  for (const m of months ?? []) {
    const { data: files } = await supa.storage.from("bills").list(`${DEMO_FACTORY_ID}/${m.name}`, { limit: 1000 });
    for (const f of files ?? []) paths.push(`${DEMO_FACTORY_ID}/${m.name}/${f.name}`);
  }
  if (paths.length) await supa.storage.from("bills").remove(paths);
  for (const t of ["ledger_entries", "activity_records", "documents"]) {
    const { error } = await supa.from(t).delete().eq("factory_id", DEMO_FACTORY_ID);
    if (error) throw error;
  }
  return { bills_removed: paths.length };
}

export async function seedDemo() {
  const supa = db();
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
    const payload = { record_id: r.id, period_month: r.period_month, ...calculate(r.activity, r.quantity, r.unit), evidence_level: "L1+L3" };
    const hash = makeHash(payload, prev);
    const row = { org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, record_id: r.id, payload, prev_hash: prev, hash };
    prev = hash;
    return row;
  });
  const { error: e1 } = await supa.from("activity_records").insert(records);
  if (e1) throw e1;
  const { error: e2 } = await supa.from("ledger_entries").insert(ledger);
  if (e2) throw e2;
  return { months: 12, records: records.length };
}
