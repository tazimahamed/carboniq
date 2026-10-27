// Auditor/buyer: record-এর মূল বিল দেখা (১০ মিনিটের জন্য বৈধ link)
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("record");
    if (!id) throw new Error("record id দিন");
    const { data: rec, error } = await db().from("activity_records").select("document_id, documents(file_path)")
      .eq("id", id).eq("factory_id", DEMO_FACTORY_ID).single();
    if (error) throw error;
    const path = (rec?.documents as unknown as { file_path: string } | null)?.file_path;
    if (!path) throw new Error("এই record-এর সাথে কোনো বিল সংযুক্ত নেই");
    const { data, error: e2 } = await db().storage.from("bills").createSignedUrl(path, 600);
    if (e2) throw e2;
    return Response.redirect(data.signedUrl, 302);
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 404 });
  }
}
