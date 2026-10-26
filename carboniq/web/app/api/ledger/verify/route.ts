import { db } from "@/lib/supabase";
import { verifyChain } from "@/lib/ledger";
import { DEMO_FACTORY_ID } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await db().from("ledger_entries").select("payload, prev_hash, hash")
      .eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: true });
    if (error) throw error;
    return Response.json({ entries: data?.length ?? 0, valid: verifyChain(data ?? []) });
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
