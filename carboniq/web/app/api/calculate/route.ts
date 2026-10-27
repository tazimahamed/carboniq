import { createHash } from "crypto";
import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID } from "@/lib/demo";
import { errMsg, saveConfirmed, type Evidence } from "@/lib/record";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const type = req.headers.get("content-type") || "";
    // বিলের ছবি ছাড়া (হাতে লেখা) — JSON
    if (type.includes("application/json")) {
      const { activity, quantity, unit, month } = await req.json();
      return Response.json(await saveConfirmed(activity, Number(quantity), unit, month));
    }

    // বিলের ছবিসহ — multipart
    const form = await req.formData();
    const file = form.get("file");
    const activity = String(form.get("activity"));
    const unit = String(form.get("unit"));
    const quantity = Number(form.get("quantity"));
    const month = String(form.get("month"));
    if (!(file instanceof File)) throw new Error("বিলের ছবি পাওয়া যায়নি");
    if (file.size > 4 * 1024 * 1024) throw new Error("ছবি ৪ MB-এর বেশি");

    const buf = Buffer.from(await file.arrayBuffer());
    const serverHash = createHash("sha256").update(buf).digest("hex");
    const clientHash = String(form.get("file_hash") || "");
    if (clientHash && clientHash !== serverHash) throw new Error("ছবির hash মেলেনি — upload-এর সময় ফাইল বদলে গেছে");

    const path = `${DEMO_FACTORY_ID}/${month}/${serverHash}.jpg`;
    const { error: eUp } = await db().storage.from("bills").upload(path, buf, { contentType: file.type || "image/jpeg", upsert: false });
    if (eUp && !/exists|duplicate/i.test(eUp.message)) throw new Error("বিল সংরক্ষণ করা যায়নি: " + eUp.message);

    const meta = JSON.parse(String(form.get("meta") || "{}"));
    const evidence: Evidence = {
      file_hash: serverHash, file_path: path,
      ocr_confidence: typeof meta.ocr_confidence === "number" ? meta.ocr_confidence : undefined,
      meter_check: meta.meter_check ?? null,
      edited_after_ocr: !!meta.edited_after_ocr,
    };
    return Response.json(await saveConfirmed(activity, quantity, unit, month, "demo-user", evidence));
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}
