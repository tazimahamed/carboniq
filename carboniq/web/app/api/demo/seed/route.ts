// ফাঁকা demo factory-তে synthetic ডেটা বসানো
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";
import { clearDemo, seedDemo } from "@/lib/demoSeed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const { count, error } = await db().from("ledger_entries").select("*", { count: "exact", head: true }).eq("factory_id", DEMO_FACTORY_ID);
    if (error) throw error;
    if ((count ?? 0) > 0) return Response.json({ error: "Demo factory-তে আগেই ডেটা আছে" }, { status: 400 });
    await clearDemo(); // আগের অসম্পূর্ণ চেষ্টার অবশিষ্ট মুছে ফেলা
    return Response.json({ ok: true, ...(await seedDemo()) });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 500 });
  }
}
