import { db } from "./supabase";
import { DEMO_FACTORY_ID } from "./demo";
import type { LedgerEntry } from "./mcp";
import { verifyChain } from "./ledger";

export async function loadLedger(): Promise<LedgerEntry[]> {
  const { data, error } = await db().from("ledger_entries").select("id, payload, prev_hash, hash")
    .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LedgerEntry[];
}

export async function loadProduction() {
  const { data, error } = await db().from("production").select("period_month, buyer, pieces").eq("factory_id", DEMO_FACTORY_ID);
  if (error) return []; // migration_2 না থাকলে খালি
  return data ?? [];
}

const missing = (m?: string) => /does not exist|could not find/i.test(m ?? "");

/** MRV প্রকল্প; migration_3 না থাকলে demo প্রকল্পটা দেখানো হয় (সংরক্ষণ ছাড়া) */
export async function loadProjects() {
  const { data, error } = await db().from("mrv_projects").select("id, name, start_month, activities, capex_tk, created_at")
    .eq("factory_id", DEMO_FACTORY_ID).order("created_at", { ascending: true });
  if (error) {
    if (!missing(error.message)) throw error;
    const { DEMO_PROJECT } = await import("./demoModel");
    return { projects: [{ id: DEMO_PROJECT.id, name: DEMO_PROJECT.name, start: DEMO_PROJECT.start, activities: DEMO_PROJECT.activities, capexTk: DEMO_PROJECT.capexTk }], needsMigration: true };
  }
  return { projects: ((data ?? []) as { id: string; name: string; start_month: string; activities: string[]; capex_tk: number | null }[]).map((p) => ({ id: p.id, name: p.name, start: String(p.start_month).slice(0, 7), activities: p.activities, capexTk: p.capex_tk })), needsMigration: false };
}

/** যাচাইয়ের ঘটনা + তাদের hash-chain অক্ষত কিনা */
export async function loadVerifications(targetType?: string, targetId?: string) {
  const { data, error } = await db().from("verifications")
    .select("id, target_type, target_id, level, reviewer, organization, scope, reference, statement, created_at, prev_hash, hash")
    .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: true });
  if (error) { if (missing(error.message)) return { events: [], chainValid: null, needsMigration: true }; throw error; }
  type V = { id: number; target_type: string; target_id: string; level: string; reviewer: string; organization: string; scope: string; reference: string | null; statement: string | null; created_at: string; prev_hash: string; hash: string };
  const all = ((data ?? []) as V[]).map((e) => ({ ...e, payload: { target_type: e.target_type, target_id: e.target_id, level: e.level, reviewer: e.reviewer, organization: e.organization, scope: e.scope, reference: e.reference, statement: e.statement, at: new Date(e.created_at).toISOString() } }));
  const chainValid = verifyChain(all);
  const events = all.filter((e) => (!targetType || e.target_type === targetType) && (!targetId || e.target_id === targetId))
    .map(({ prev_hash: _p, payload: _x, ...e }) => e);
  return { events, chainValid, needsMigration: false };
}
