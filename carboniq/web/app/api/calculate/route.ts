import { errMsg, saveConfirmed } from "@/lib/record";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { activity, quantity, unit, month } = await req.json();
    return Response.json(await saveConfirmed(activity, Number(quantity), unit, month));
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 400 });
  }
}
