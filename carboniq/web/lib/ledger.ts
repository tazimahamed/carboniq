// SHA-256 hash chain: পরে কেউ record বদলালে ধরা পড়ে
import { createHash } from "crypto";

export const GENESIS = "0".repeat(64);

function stable(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  const o = v as Record<string, unknown>;
  return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + stable(o[k])).join(",") + "}";
}

export function makeHash(payload: unknown, prevHash: string) {
  return createHash("sha256").update(stable(payload) + prevHash, "utf8").digest("hex");
}

export function verifyChain(entries: { payload: unknown; prev_hash: string; hash: string }[]) {
  let prev = GENESIS;
  for (const e of entries) {
    if (e.prev_hash !== prev || e.hash !== makeHash(e.payload, prev)) return false;
    prev = e.hash;
  }
  return true;
}
