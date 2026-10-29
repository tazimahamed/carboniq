// Carbon Passport: একটা buyer order-এর প্রতি পিস নির্গমন, প্রমাণসহ — তৈরির মুহূর্তে hash-সিল
import { randomBytes } from "crypto";
import { FACTORS } from "./factors";
import { makeHash, verifyChain } from "./ledger";
import { buyerShare, evidenceScore, type InProd, type InRow } from "./insights";
import type { LedgerEntry } from "./mcp";
import { ledgerToRows } from "./passportRows";
import { monteCarlo, periodRisk, recordRisks } from "./risk";
import { mrv, type MrvProject } from "./mrv";

export { PASSPORT_DISCLAIMER } from "./passportText";

const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // ভুল পড়া যায় এমন 0/O/1/I বাদ
export function newPassportId() {
  return Array.from(randomBytes(8)).map((b) => ALPHA[b % ALPHA.length]).join("");
}

export { ledgerToRows };

export type PassportInput = { buyer: string; order_ref: string; pieces: number; from: string; to: string; project?: MrvProject | null; nowMonth?: string };

export const METHODOLOGY_VERSION = "carboniq-method-1.1";

export function buildPassport(entries: LedgerEntry[], prod: InProd[], inp: PassportInput) {
  if (!entries.length) throw new Error("Ledger-এ কোনো record নেই");
  const rows = ledgerToRows(entries).filter((r) => r.period_month.slice(0, 7) >= inp.from && r.period_month.slice(0, 7) <= inp.to);
  const share = buyerShare(rows, prod, inp.from, inp.to).find((b) => b.buyer === inp.buyer);
  if (!share || !share.pieces) throw new Error("এই সময়ে এই buyer-এর কোনো উৎপাদন নেই");
  const valid = verifyChain(entries);
  const ev = evidenceScore(rows, valid);
  const kgPerPiece = share.kgPerPiece;
  const s1 = rows.filter((r) => r.scope === 1).reduce((a, r) => a + r.kg_co2e, 0);
  const tot = rows.reduce((a, r) => a + r.kg_co2e, 0) || 1;
  const used = Array.from(new Set(rows.map((r) => r.activity)));
  const ledgerHash = entries.at(-1)!.hash;

  // অনিশ্চয়তা: পুরো সময়ের Monte Carlo, তারপর এই order-এর ভাগে একই আপেক্ষিক পরিসর
  const mc = monteCarlo(entries, inp.from, inp.to);
  const orderT = (kgPerPiece * inp.pieces) / 1000, rel = mc.central ? orderT / mc.central : 0;
  const risk = periodRisk(recordRisks(entries, prod, inp.nowMonth ?? new Date().toISOString().slice(0, 7)), inp.from, inp.to);
  let reduction = null as null | Record<string, unknown>;
  if (inp.project) {
    const allRows = ledgerToRows(entries), r = mrv(inp.project, allRows, prod);
    reduction = {
      project: inp.project.name, start: inp.project.start, status: r.status, preliminary: r.preliminary,
      claimed_tco2e: Math.round(r.claimedT * 10) / 10, claimed_u90: Math.round(r.claimedUT * 10) / 10,
      net_tco2e: Math.round(r.netT * 10) / 10, net_u90: Math.round(r.netUT * 10) / 10,
      leakage: r.leakage.map((l) => l.text), intensity_change_pct: Math.round(r.intensity.changePct * 10) / 10,
      baseline: r.baseline, post: r.post, method: "IPMVP Option C-র ধারণা: পুরো কারখানার মাসিক বিল, regression baseline, ৯০% prediction interval; ASHRAE 14 fit মানদণ্ড",
    };
  }

  const payload = {
    v: 2,
    factory: { name: "Demo Knit Factory", location: "গাজীপুর, বাংলাদেশ", demo: true },
    buyer: inp.buyer, order_ref: inp.order_ref, pieces: inp.pieces,
    period: { from: inp.from, to: inp.to },
    kg_per_piece: Math.round(kgPerPiece * 10000) / 10000,
    order_tco2e: Math.round(orderT * 100) / 100,
    order_tco2e_range95: [Math.round(mc.lo * rel * 100) / 100, Math.round(mc.hi * rel * 100) / 100],
    buyer_period: { pieces: share.pieces, tco2e: Math.round(share.tonnes * 100) / 100 },
    scope_split: { scope1_pct: Math.round((s1 / tot) * 100), scope2_pct: 100 - Math.round((s1 / tot) * 100) },
    evidence: { score: ev.score, grade: ev.grade },
    risk: { score: risk.score, level: risk.level, audit_priority: risk.priority, reasons: risk.reasons.slice(0, 3) },
    reduction,
    calculation_boundary: "কারখানার Scope ১ (জ্বালানি পোড়ানো) + Scope ২ (কেনা বিদ্যুৎ, location-based)-এর ভাগ। কাঁচামাল, পরিবহন ও অন্যান্য Scope ৩ অন্তর্ভুক্ত নয় — এটা পূর্ণ product carbon footprint নয়",
    allocation: { method: "uniform_per_piece", driver: "উৎপাদিত পিস", note: "মাসিক নির্গমন buyer-দের মধ্যে পিসের অনুপাতে সমান ভাগ — পণ্যের ধরনে বড় পার্থক্য থাকলে machine-hour বা ওজন দিয়ে ভাগ বেশি সঠিক" },
    methodology_version: METHODOLOGY_VERSION,
    factors: FACTORS.filter((f) => used.includes(f.activity)).map((f) => ({ activity: f.activity, value: f.kgPerUnit, unit: f.unit, source: f.source, license: f.license, version: f.version, year: f.year, geography: f.geography, proxy: f.proxy })),
    method: "GHG Protocol Corporate Standard ও Scope 2 Guidance (location-based)",
    records: rows.length,
    ledger_entries: entries.length,
    created_at: new Date().toISOString(),
  };
  return { payload, ledgerHash, hash: makeHash(payload, ledgerHash) };
}

/** যাচাই: সংরক্ষিত payload-এর hash মেলে কিনা, ledger এখনো অক্ষত কিনা, তৈরির সময়ের ledger hash এখনো chain-এ আছে কিনা */
export function verifyPassport(stored: { payload: unknown; ledger_hash: string; hash: string; revoked: boolean }, entries: LedgerEntry[]) {
  const hashOk = makeHash(stored.payload, stored.ledger_hash) === stored.hash;
  const chainOk = verifyChain(entries);
  const anchorOk = entries.some((e) => e.hash === stored.ledger_hash);
  return { hashOk, chainOk, anchorOk, revoked: stored.revoked, valid: hashOk && chainOk && anchorOk && !stored.revoked };
}
