import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// শুধু server-এ ব্যবহার করো (service role key browser-এ যাবে না)
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env variable বসানো হয়নি");
  client = createClient(url, key, {
    auth: { persistSession: false },
    // Next.js যেন পুরনো ফল cache করে না রাখে
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  return client;
}
