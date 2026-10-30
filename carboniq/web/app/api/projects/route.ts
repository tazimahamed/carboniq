// MRV প্রকল্প: কোন প্রকল্প, কবে শুরু, কোন জ্বালানিতে প্রভাব
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";
import { loadLedger, loadProjects } from "@/lib/ledgerData";
import { foldEvidence } from "@/lib/passportRows";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await loadProjects());
  } catch (err) {
    return Response.json({ error: errMsg(err), projects: [] }, { status: 500 });
  }
}

const ACTS = ["electricity", "natural_gas", "diesel", "lpg"];
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const name = String(b.name ?? "").trim(), start = String(b.start ?? "");
    const activities = (Array.isArray(b.activities) ? b.activities : []).filter((a: unknown) => typeof a === "string" && ACTS.includes(a));
    const capex = b.capexTk === undefined || b.capexTk === null || b.capexTk === "" ? null : Number(b.capexTk);
    if (!name || name.length > 100) throw new Error("প্রকল্পের নাম দিন");
    if (!/^\d{4}-\d{2}$/.test(start)) throw new Error("শুরুর মাস দিন");
    if (!activities.length) throw new Error("অন্তত একটা জ্বালানি বাছুন");
    if (capex !== null && (!isFinite(capex) || capex < 0)) throw new Error("বিনিয়োগ সঠিক নয়");
    // প্রকল্পের আগে কমপক্ষে ৬ মাস আর পরে কমপক্ষে ১ মাসের বিল থাকতে হবে — না হলে যাচাই অসম্ভব
    const recs = foldEvidence(await loadLedger()).map((e) => e.payload).filter((p) => activities.includes(p.activity));
    const months = Array.from(new Set(recs.map((p) => String(p.period_month).slice(0, 7)))).sort();
    if (!months.length) throw new Error("বাছাই করা জ্বালানির কোনো বিল নেই");
    const before = months.filter((m) => m < start).length, after = months.filter((m) => m >= start).length;
    if (after < 1) throw new Error(`${start} বা তার পরের কোনো বিল নেই (শেষ বিল ${months.at(-1)}) — প্রকল্প চালুর পরের বিল upload করে তারপর যোগ করুন`);
    if (before < 6) throw new Error(`প্রকল্পের আগে মাত্র ${before} মাসের বিল (প্রথম বিল ${months[0]}) — baseline-এর জন্য কমপক্ষে ৬ মাস লাগে`);
    const id = "p-" + Date.now().toString(36);
    const { error } = await db().from("mrv_projects").insert({ id, org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, name, start_month: `${start}-01`, activities, capex_tk: capex });
    if (error) throw new Error(/does not exist|could not find/i.test(error.message) ? "supabase/migration_3 চালান" : error.message);
    return Response.json({ id });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id || id.startsWith("demo-")) throw new Error("Demo প্রকল্প মোছা যায় না");
    const { error } = await db().from("mrv_projects").delete().eq("id", id).eq("factory_id", DEMO_FACTORY_ID);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}
