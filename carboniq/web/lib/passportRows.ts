import type { InRow } from "./insights";

type Entry = { payload: Record<string, any> };
export function ledgerToRows(entries: Entry[]): InRow[] {
  return entries.map((e) => ({
    activity: e.payload.activity, quantity: Number(e.payload.quantity), period_month: String(e.payload.period_month),
    scope: Number(e.payload.scope), kg_co2e: Number(e.payload.kg_co2e),
    has_bill: !!e.payload.evidence, meter_ok: e.payload.evidence?.meter_check?.ok ?? null,
  }));
}
