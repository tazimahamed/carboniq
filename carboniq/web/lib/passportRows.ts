import type { InRow } from "./insights";

type Entry = { payload: Record<string, any> };

/** Ledger append-only: পরে সংযুক্ত মূল বিল একটা আলাদা "evidence" entry হিসেবে আসে।
 *  হিসাবের জন্য সেটাকে মূল record-এর সাথে মেলানো হয় — record-এর সংখ্যা কখনো বদলায় না। */
export function foldEvidence<T extends Entry>(entries: T[]): T[] {
  const att = new Map<string, Record<string, any>>();
  for (const e of entries) if (e.payload?.kind === "evidence") att.set(String(e.payload.record_id), e.payload);
  return entries.filter((e) => e.payload?.kind !== "evidence").map((e) => {
    const a = att.get(String(e.payload.record_id));
    if (!a || e.payload.evidence) return e;
    return { ...e, payload: { ...e.payload, evidence: a.evidence, evidence_level: "L2+L3", bill_check: a.bill_check } };
  });
}

/** বিল আর মিটার দুটোই মিললে তবেই "মিটার মিলেছে" */
export function meterOk(p: Record<string, any>): boolean | null {
  const m = p.evidence?.meter_check?.ok;
  if (m == null) return null;
  return !!m && p.bill_check?.ok !== false;
}

export function ledgerToRows(entries: Entry[]): InRow[] {
  return foldEvidence(entries).map((e) => ({
    activity: e.payload.activity, quantity: Number(e.payload.quantity), period_month: String(e.payload.period_month),
    scope: Number(e.payload.scope), kg_co2e: Number(e.payload.kg_co2e),
    has_bill: !!e.payload.evidence, meter_ok: meterOk(e.payload),
  }));
}
