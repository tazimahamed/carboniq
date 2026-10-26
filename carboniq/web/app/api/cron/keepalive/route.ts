// Vercel প্রতিদিন একবার চালায়, যাতে Supabase free project pause না হয়
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { count, error } = await db().from("organizations").select("*", { count: "exact", head: true });
  return Response.json({ ok: !error, organizations: count });
}
