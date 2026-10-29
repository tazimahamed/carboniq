// ছোট in-memory rate limit (প্রতি IP, sliding window)। Serverless-এ প্রতিটা instance আলাদা গোনে — best-effort সুরক্ষা।
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit = 60, windowMs = 60_000, now = Date.now()) {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const ok = arr.length < limit;
  if (ok) arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) for (const k of Array.from(hits.keys()).slice(0, 1000)) hits.delete(k); // memory সীমিত রাখা
  return { ok, remaining: Math.max(0, limit - arr.length), retryAfter: ok ? 0 : Math.ceil((windowMs - (now - arr[0])) / 1000) };
}
export const clientKey = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
