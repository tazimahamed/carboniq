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

  const { data: dup } = await supa.from("activity_records").select("id")
    .eq("factory_id", DEMO_FACTORY_ID).eq("activity", activity).eq("period_month", period).eq("status", "confirmed").limit(1);
  if (dup && dup.length) throw new Error(`এই মাসের (${month}) ${activity} আগেই নিশ্চিত করা হয়েছে — দুবার গোনা হবে না`);

  let documentId: string | null = null;
  if (evidence) {
    const { data: doc, error: eDoc } = await supa.from("documents").insert({
      org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, file_path: evidence.file_path, file_hash: evidence.file_hash,
      ocr_engine: "tesseract.js ben+eng",
    }).select("id").single();
    if (eDoc) {
      if (eDoc.code === "23505") throw new Error("এই একই বিলের ছবি আগেই upload করা হয়েছে");
      throw eDoc;
    }
    documentId = doc.id;
  }

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

export function errMsg(err: unknown) {
  return err instanceof Error ? err.message : (err as { message?: string })?.message || "সমস্যা হয়েছে";
}
