// মাসভিত্তিক উৎপাদন (পিস), buyer অনুযায়ী
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await db().from("production").select("period_month, buyer, pieces")
      .eq("factory_id", DEMO_FACTORY_ID).order("period_month", { ascending: true });
    if (error) throw error;
    return Response.json({ production: data ?? [] });
  } catch (err) {
    return Response.json({ error: errMsg(err), production: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { month, buyer, pieces } = await req.json();
    if (!/^\d{4}-\d{2}$/.test(month || "")) throw new Error("মাস দিন (YYYY-MM)");
    if (!buyer || typeof buyer !== "string" || buyer.length > 80) throw new Error("Buyer-এর নাম দিন");
    const n = Number(pieces);
    if (!Number.isInteger(n) || n < 0) throw new Error("পিসের সংখ্যা সঠিক নয়");
    const { error } = await db().from("production").upsert(
      { org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, period_month: `${month}-01`, buyer: buyer.trim(), pieces: n },
      { onConflict: "factory_id,period_month,buyer" });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}
