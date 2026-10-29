// MRV প্রকল্প: কোন প্রকল্প, কবে শুরু, কোন জ্বালানিতে প্রভাব
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID, DEMO_ORG_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";
import { loadProjects } from "@/lib/ledgerData";

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
    const id = "p-" + Date.now().toString(36);
    const { error } = await db().from("mrv_projects").insert({ id, org_id: DEMO_ORG_ID, factory_id: DEMO_FACTORY_ID, name, start_month: `${start}-01`, activities, capex_tk: capex });
    if (error) throw new Error(/does not exist|could not find/i.test(error.message) ? "supabase/migration_3 চালান" : error.message);
    return Response.json({ id });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}
