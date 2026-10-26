// Synthetic demo data: ১২ মাস (নভেম্বর ২০২৫ – অক্টোবর ২০২৬)। শুধু ফাঁকা থাকলে চলে।
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID } from "@/lib/demo";
import { errMsg, saveConfirmed } from "@/lib/record";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SEASON = [0.85, 0.8, 0.85, 0.95, 1.1, 1.2, 1.25, 1.2, 1.15, 1.1, 1.05, 0.95]; // গরমে বিদ্যুৎ বেশি

export async function POST() {
  try {
    const { count } = await db().from("activity_records").select("*", { count: "exact", head: true }).eq("factory_id", DEMO_FACTORY_ID);
    if ((count ?? 0) > 0) return Response.json({ error: "Demo factory-তে আগেই ডেটা আছে" }, { status: 400 });
    let n = 0;
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(2025, 10 + i, 1));
      const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      await saveConfirmed("electricity", Math.round(120000 * SEASON[i]), "kWh", month, "demo-seed");
      await saveConfirmed("natural_gas", Math.round(45000 * (2 - SEASON[i])), "m3", month, "demo-seed");
      if (i % 3 === 0) await saveConfirmed("diesel", 3200, "litre", month, "demo-seed");
      n++;
    }
    return Response.json({ ok: true, months: n });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 500 });
  }
}
