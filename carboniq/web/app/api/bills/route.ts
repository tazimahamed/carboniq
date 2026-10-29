import { db } from "@/lib/supabase";
import { DEMO_FACTORY_ID } from "@/lib/demo";
import { errMsg } from "@/lib/record";
import { loadLedger } from "@/lib/ledgerData";
import { foldEvidence, meterOk } from "@/lib/passportRows";

export const dynamic = "force-dynamic";

/** সংরক্ষিত মূল বিলের তালিকা — কোন record-এর প্রমাণ, মিলেছে কিনা, আর ১ ঘণ্টার জন্য দেখার link (bucket private) */
export async function GET() {
  try {
    const recs = foldEvidence(await loadLedger()).filter((e) => e.payload.evidence?.file_path);
    const supa = db();
    const bills = await Promise.all(recs.map(async (e) => {
      const p = e.payload, ev = p.evidence;
      const { data } = await supa.storage.from("bills").createSignedUrl(ev.file_path, 3600);
      return {
        month: String(p.period_month).slice(0, 7), activity: p.activity, quantity: p.quantity, unit: p.unit,
        file_hash: ev.file_hash, ocr_confidence: ev.ocr_confidence ?? null,
        meter_ok: meterOk(p), bill_match: p.bill_check?.ok ?? null, attached_later: !!p.bill_check,
        url: data?.signedUrl ?? null,
      };
    }));
    bills.sort((a, b) => b.month.localeCompare(a.month));
    return Response.json({ bills });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 500 });
  }
}
