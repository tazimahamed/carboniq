// Demo আবার শুরু: demo factory-র সব ডেটা আর বিল মুছে নতুন synthetic ডেটা বসায়।
// শুধু DEMO factory-তে কাজ করে। Production-এ বন্ধ রাখতে: Vercel env DEMO_RESET=off
import { errMsg } from "@/lib/record";
import { clearDemo, seedDemo } from "@/lib/demoSeed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

let lastReset = 0;

export async function POST() {
  if (process.env.DEMO_RESET === "off") return Response.json({ error: "Demo reset বন্ধ" }, { status: 403 });
  if (Date.now() - lastReset < 30_000) return Response.json({ error: "একটু আগেই reset হয়েছে — ৩০ সেকেন্ড পর চেষ্টা করুন" }, { status: 429 });
  lastReset = Date.now();
  try {
    const cleared = await clearDemo();
    const seeded = await seedDemo();
    return Response.json({ ok: true, ...cleared, ...seeded });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 500 });
  }
}
