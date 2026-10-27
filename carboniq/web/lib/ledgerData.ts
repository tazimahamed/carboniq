import { db } from "./supabase";
import { DEMO_FACTORY_ID } from "./demo";
import type { LedgerEntry } from "./mcp";

export async function loadLedger(): Promise<LedgerEntry[]> {
  const { data, error } = await db().from("ledger_entries").select("id, payload, prev_hash, hash")
    .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LedgerEntry[];
}
