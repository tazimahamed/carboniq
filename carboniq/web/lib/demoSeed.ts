// Synthetic demo data: ১২ মাস (নভেম্বর ২০২৫ – অক্টোবর ২০২৬), সব একবারে (batch)
import { randomUUID } from "crypto";
import { calculate } from "./engine";
import { GENESIS, makeHash } from "./ledger";
import { db } from "./supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "./demo";
import { BUYERS, demoMonths } from "./demoModel";


function isMissingTable(e: { code?: string; message?: string }) {
  return e.code === "42P01" || e.code === "PGRST205" || /does not exist|could not find the table/i.test(e.message ?? "");
}

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
  for (const t of ["passports", "production", "ledger_entries", "activity_records", "documents"]) {
    const { error } = await supa.from(t).delete().eq("factory_id", DEMO_FACTORY_ID);
    if (error && !isMissingTable(error)) throw error; // migration_2 না চালানো থাকলেও reset চলবে
  }
  return { bills_removed: paths.length };
}

export async function seedDemo() {
  const supa = db();
  const now = new Date().toISOString();
  const items: { activity: string; quantity: number; unit: string; period: string }[] = [];
  const production: { org_id: string; factory_id: string; period_month: string; buyer: string; pieces: number }[] = [];
  for (const m of demoMonths()) {
    const period = `${m.month}-01`;
    items.push({ activity: "electricity", quantity: m.kwh, unit: "kWh", period });
    items.push({ activity: "natural_gas", quantity: m.gas, unit: "m3", period });
    items.push({ activity: "diesel", quantity: m.diesel, unit: "litre", period });
    let left = m.pieces;
    BUYERS.forEach((b, i) => {
      const p = i === BUYERS.length - 1 ? left : Math.round(m.pieces * b.share);
      left -= p;
      production.push({ org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, period_month: period, buyer: b.name, pieces: p });
    });
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
  const { error: e3 } = await supa.from("production").insert(production);
  if (e3 && !isMissingTable(e3)) throw e3;
  return { months: 12, records: records.length };
}
