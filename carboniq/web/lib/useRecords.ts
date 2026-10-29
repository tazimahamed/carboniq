"use client";
import { useEffect, useState } from "react";

export type Row = {
  id: string; activity: string; quantity: number; unit: string; period_month: string;
  scope: number; kg_co2e: number; hash: string; factor: number; factor_source: string; factor_version: string;
  record_id: string; evidence_level: string; has_bill: boolean; meter_ok: boolean | null;
};

export type Prod = { period_month: string; buyer: string; pieces: number };

export function useRecords() {
  const [production, setProduction] = useState<Prod[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError("");
    const r = await fetch("/api/records", { cache: "no-store" }).then((x) => x.json());
    if (r.error) setError(r.error); else setRows(r.records);
    const [v, p] = await Promise.all([
      fetch("/api/ledger/verify", { cache: "no-store" }).then((x) => x.json()),
      fetch("/api/production", { cache: "no-store" }).then((x) => x.json()).catch(() => ({ production: [] })),
    ]);
    setProduction(p.production ?? []);
    setValid(v.error ? null : v.valid);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const total = (s?: number) => rows.filter((r) => !s || r.scope === s).reduce((a, r) => a + r.kg_co2e, 0) / 1000;
  return { rows, production, valid, error, loading, total, reload: load };
}
