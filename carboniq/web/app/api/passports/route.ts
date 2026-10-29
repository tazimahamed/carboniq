// Passport তালিকা (factory) আর নতুন passport তৈরি
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";
import { loadLedger } from "@/lib/ledgerData";
import { buildPassport, newPassportId } from "@/lib/passport";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await db().from("passports").select("id, buyer, order_ref, pieces, period_from, period_to, payload, revoked, created_at")
      .eq("factory_id", DEMO_FACTORY_ID).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return Response.json({ passports: data ?? [] });
  } catch (err) {
    return Response.json({ error: errMsg(err), passports: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const buyer = String(b.buyer ?? "").trim(), order_ref = String(b.order_ref ?? "").trim();
    const pieces = Number(b.pieces), from = String(b.from ?? ""), to = String(b.to ?? "");
    if (!buyer || buyer.length > 80) throw new Error("Buyer বাছুন");
    if (!order_ref || order_ref.length > 60) throw new Error("Order নম্বর দিন");
    if (!Number.isInteger(pieces) || pieces <= 0 || pieces > 10_000_000) throw new Error("পিসের সংখ্যা সঠিক নয়");
    if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to) || from > to) throw new Error("সময়কাল সঠিক নয়");

    const entries = await loadLedger();
    const { data: prod, error: e1 } = await db().from("production").select("period_month, buyer, pieces").eq("factory_id", DEMO_FACTORY_ID);
    if (e1) throw new Error("উৎপাদনের table পাওয়া যায়নি — supabase/migration_2 চালান");
    const p = buildPassport(entries, prod ?? [], { buyer, order_ref, pieces, from, to });
    const id = newPassportId();
    const { error } = await db().from("passports").insert({
      id, org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, buyer, order_ref, pieces,
      period_from: `${from}-01`, period_to: `${to}-01`, payload: p.payload, ledger_hash: p.ledgerHash, hash: p.hash,
    });
    if (error) throw error;
    return Response.json({ id, hash: p.hash, payload: p.payload });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}
