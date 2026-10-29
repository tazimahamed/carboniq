// যাচাইয়ের ঘটনা (কারখানার যাচাই / স্বাধীন যাচাই) — নিজস্ব hash-chain, শুধু যোগ করা যায়
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";
import { GENESIS, makeHash } from "@/lib/ledger";
import { loadVerifications } from "@/lib/ledgerData";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    return Response.json(await loadVerifications(u.searchParams.get("target_type") ?? undefined, u.searchParams.get("target_id") ?? undefined));
  } catch (err) {
    return Response.json({ error: errMsg(err), events: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const s = (k: string, max = 200) => { const v = String(b[k] ?? "").trim(); if (v.length > max) throw new Error(`${k} খুব লম্বা`); return v; };
    const target_type = s("target_type"), target_id = s("target_id", 80), level = s("level");
    const reviewer = s("reviewer", 100), organization = s("organization", 120), scope = s("scope", 300), reference = s("reference", 200), statement = s("statement", 600);
    if (!["passport", "project", "inventory"].includes(target_type) || !target_id) throw new Error("কী যাচাই হচ্ছে তা সঠিক নয়");
    if (!["factory_review", "independent"].includes(level)) throw new Error("যাচাইয়ের স্তর সঠিক নয়");
    if (!reviewer || !organization || !scope) throw new Error("যাচাইকারীর নাম, প্রতিষ্ঠান আর পরিধি দিন");
    if (level === "independent" && !reference) throw new Error("স্বাধীন যাচাইয়ের জন্য রিপোর্ট/সনদের রেফারেন্স দিন");
    const supa = db();
    const { data: last, error: e0 } = await supa.from("verifications").select("hash").eq("factory_id", DEMO_FACTORY_ID).order("id", { ascending: false }).limit(1).maybeSingle();
    if (e0) throw new Error(/does not exist|could not find/i.test(e0.message) ? "supabase/migration_3 চালান" : e0.message);
    const prev = last?.hash ?? GENESIS, at = new Date().toISOString();
    const payload = { target_type, target_id, level, reviewer, organization, scope, reference: reference || null, statement: statement || null, at };
    const hash = makeHash(payload, prev);
    const { error } = await supa.from("verifications").insert({ org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, ...payload, created_at: at, prev_hash: prev, hash });
    if (error) throw error;
    return Response.json({ ok: true, hash });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}
