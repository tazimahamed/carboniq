// Public: একটা passport আর তার যাচাই (QR scan করলে এটাই খোলে)। PATCH: factory বাতিল করতে পারে।
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";
import { loadLedger, loadVerifications } from "@/lib/ledgerData";
import { verificationStatus, type VEvent } from "@/lib/verification";
import { verifyPassport } from "@/lib/passport";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (!/^[A-Z2-9]{8}$/.test(params.id)) throw new Error("Passport পাওয়া যায়নি");
    const { data, error } = await db().from("passports").select("id, payload, ledger_hash, hash, revoked, created_at").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Passport পাওয়া যায়নি" }, { status: 404 });
    const check = verifyPassport(data, await loadLedger());
    const v = await loadVerifications("passport", params.id).catch(() => ({ events: [], chainValid: null }));
    const vs = verificationStatus(v.events as VEvent[], "passport", params.id);
    const verification = { highest: vs.highest, factory: vs.factory, independent: vs.independent, chainValid: v.chainValid };
    return Response.json({ passport: data, check, verification }, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { revoked } = await req.json();
    const { error } = await db().from("passports").update({ revoked: !!revoked }).eq("id", params.id).eq("factory_id", DEMO_FACTORY_ID);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}
