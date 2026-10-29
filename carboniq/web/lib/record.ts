// একটা নিশ্চিত record → হিসাব → ledger-এ সিল। বিলের ছবি থাকলে তার hash-ও সিলের অংশ।
import { calculate } from "./engine";
import { GENESIS, makeHash } from "./ledger";
import { db } from "./supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "./demo";

export type Evidence = {
  file_hash: string;          // মূল ছবির SHA-256 (browser-এ হিসাব, server-এ আবার যাচাই)
  file_path: string;          // Supabase Storage-এ কোথায়
  ocr_confidence?: number;
  meter_check?: { previous: number; present: number; multiplier: number; expected: number; ok: boolean } | null;
  edited_after_ocr?: boolean; // OCR-এর সংখ্যা user বদলেছে কিনা
};

export function evidenceLevel(ev?: Evidence | null) {
  // L1 = মানুষ নিশ্চিত করেছে, L2 = মূল বিল সংযুক্ত, L3 = hash-সিল (সব record-ই সিল হয়)
  return ev ? "L2+L3" : "L1+L3";
}

export async function saveConfirmed(activity: string, quantity: number, unit: string, month: string, by = "demo-user", evidence?: Evidence) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) throw new Error("মাস দিন (YYYY-MM)");
  const result = calculate(activity, quantity, unit);
  const supa = db();
  const period = `${month}-01`;

  const { data: dup } = await supa.from("activity_records").select("id, quantity, document_id")
    .eq("factory_id", DEMO_FACTORY_ID).eq("activity", activity).eq("period_month", period).eq("status", "confirmed").limit(1);
  if (dup && dup.length) {
    // একই মাসের record আছে কিন্তু মূল বিল নেই → নতুন record না বানিয়ে বিলটা প্রমাণ হিসেবে যুক্ত করা (দুবার গোনা হয় না)
    if (evidence && !dup[0].document_id && !(await hasAttachment(dup[0].id))) return attachEvidence(dup[0], activity, quantity, unit, period, evidence);
    throw new Error(`এই মাসের (${month}) ${activity} আগেই নিশ্চিত করা হয়েছে, বিলও যুক্ত আছে — দুবার গোনা হবে না`);
  }

  let documentId: string | null = null;
  if (evidence) documentId = await insertDocument(evidence);

  const { data: rec, error: e1 } = await supa.from("activity_records").insert({
    org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, document_id: documentId, activity, quantity: result.quantity, unit,
    period_month: period, status: "confirmed", confirmed_by: by, confirmed_at: new Date().toISOString(),
  }).select().single();
  if (e1) throw e1;

  const { data: last } = await supa.from("ledger_entries").select("hash")
    .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: false }).limit(1).maybeSingle();
  const prev = last?.hash ?? GENESIS;
  const payload = {
    record_id: rec.id, period_month: period, ...result,
    evidence_level: evidenceLevel(evidence),
    ...(evidence ? { evidence: { ...evidence, document_id: documentId } } : {}),
  };
  const hash = makeHash(payload, prev);

  const { error: e2 } = await supa.from("ledger_entries").insert({
    org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, record_id: rec.id, payload, prev_hash: prev, hash,
  });
  if (e2) throw e2;
  return { ...result, record_id: rec.id, ledger_hash: hash, evidence_level: payload.evidence_level, evidence: payload.evidence ?? null };
}

async function insertDocument(evidence: Evidence) {
  const { data: doc, error } = await db().from("documents").insert({
    org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, file_path: evidence.file_path, file_hash: evidence.file_hash,
    ocr_engine: "tesseract.js ben+eng",
  }).select("id").single();
  if (error) {
    if (error.code === "23505") throw new Error("এই একই বিলের ছবি আগেই upload করা হয়েছে");
    throw error;
  }
  return doc.id as string;
}

async function hasAttachment(recordId: string) {
  const { data } = await db().from("ledger_entries").select("id")
    .eq("factory_id", DEMO_FACTORY_ID).eq("record_id", recordId).eq("payload->>kind", "evidence").limit(1);
  return !!(data && data.length);
}

/** আগের record-এ মূল বিল যুক্ত করা: ledger-এ নতুন "evidence" entry (আগের কিছু বদলায় না)।
 *  বিলের সংখ্যা record-এর সাথে ১%-এর মধ্যে মিললে ok, না মিললে গরমিল হিসেবে দেখানো হয়। */
async function attachEvidence(rec: { id: string; quantity: number }, activity: string, quantity: number, unit: string, period: string, evidence: Evidence) {
  const supa = db();
  const documentId = await insertDocument(evidence);
  const recorded = Number(rec.quantity), billQty = calculate(activity, quantity, unit).quantity;
  const diffPct = recorded ? Math.abs(billQty - recorded) / recorded : 1;
  const bill_check = { recorded, bill: billQty, diff_pct: Math.round(diffPct * 10000) / 100, ok: diffPct <= 0.01 };
  const { data: last } = await supa.from("ledger_entries").select("hash")
    .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: false }).limit(1).maybeSingle();
  const prev = last?.hash ?? GENESIS;
  const payload = { kind: "evidence", record_id: rec.id, period_month: period, activity, evidence: { ...evidence, document_id: documentId }, bill_check };
  const hash = makeHash(payload, prev);
  const { error } = await supa.from("ledger_entries").insert({ org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, record_id: rec.id, payload, prev_hash: prev, hash });
  if (error) throw error;
  const result = calculate(activity, recorded, unit);
  return { ...result, record_id: rec.id, ledger_hash: hash, evidence_level: "L2+L3", evidence: payload.evidence, attached: true, bill_check };
}

export function errMsg(err: unknown) {
  return err instanceof Error ? err.message : (err as { message?: string })?.message || "সমস্যা হয়েছে";
}
