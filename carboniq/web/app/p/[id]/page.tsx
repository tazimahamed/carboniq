"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import QR from "@/components/QR";
import { LogoMark } from "@/components/Nav";
import { monthBn } from "@/lib/insights";
import { PASSPORT_DISCLAIMER } from "@/lib/passportText";

type Data = {
  passport: { id: string; hash: string; ledger_hash: string; created_at: string; payload: any };
  check: { hashOk: boolean; chainOk: boolean; anchorOk: boolean; revoked: boolean; valid: boolean };
  verification?: { highest: string; factory: VE | null; independent: VE | null; chainValid: boolean | null };
};
type VE = { reviewer: string; organization: string; scope: string; reference?: string | null; created_at: string; hash: string };
const FUEL: Record<string, string> = { electricity: "বিদ্যুৎ (grid)", natural_gas: "প্রাকৃতিক গ্যাস", diesel: "ডিজেল", lpg: "LPG" };

export default function PublicPassport() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(window.location.href);
    fetch(`/api/passports/${id}`, { cache: "no-store" }).then((r) => r.json()).then((j) => (j.error ? setErr(j.error) : setD(j))).catch(() => setErr("যাচাই করা যায়নি"));
  }, [id]);

  const p = d?.passport.payload;
  return (
    <main className="min-h-screen bg-[var(--ink)] pb-16 pt-24 text-white">
      <div className="grid-bg pointer-events-none fixed inset-0 opacity-40" />
      <div className="relative mx-auto max-w-3xl px-4">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div><h1 className="font-extrabold">Carbon Passport</h1><p className="text-xs text-white/50">CarbonIQ BD · যাচাইযোগ্য order footprint</p></div>
          <span className="ml-auto font-mono text-sm text-white/60">{id}</span>
        </div>

        {err && <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">{err}</div>}
        {!d && !err && <div className="mt-8 h-80 animate-pulse rounded-2xl bg-white/5" />}

        {d && p && (
          <>
            {/* যাচাইয়ের ফল */}
            <div className={`mt-8 rounded-2xl border p-5 ${d.check.valid ? "border-emerald-400/30 bg-emerald-400/10" : "border-red-400/40 bg-red-500/10"}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full text-lg font-bold ${d.check.valid ? "bg-emerald-400 text-[var(--ink)]" : "bg-red-400 text-white"}`}>{d.check.valid ? "✓" : "!"}</span>
                <div>
                  <p className="text-lg font-bold">{d.check.valid ? "যাচাই সফল" : d.check.revoked ? "এই passport বাতিল করা হয়েছে" : "যাচাই ব্যর্থ"}</p>
                  <p className="text-xs text-white/60">এইমাত্র live যাচাই করা হলো</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {[
                  [d.check.hashOk, "Passport-এর hash মিলেছে — তৈরির পর বদলানো হয়নি"],
                  [d.check.chainOk, "Factory-র পুরো ledger অক্ষত"],
                  [d.check.anchorOk, "তৈরির সময়ের ledger record এখনো chain-এ আছে"],
                  [!d.check.revoked, d.check.revoked ? "Factory এটা বাতিল করেছে" : "বাতিল করা হয়নি"],
                ].map(([ok, t]) => (
                  <li key={t as string} className="flex items-start gap-2"><span className={ok ? "text-emerald-300" : "text-red-300"}>{ok ? "✓" : "✗"}</span><span className="text-white/80">{t as string}</span></li>
                ))}
              </ul>
            </div>

            {/* মূল সংখ্যা */}
            <div className="mt-5 overflow-hidden rounded-2xl bg-white text-[var(--ink)]">
              <div className="grid gap-px bg-[var(--line)] sm:grid-cols-[1.3fr_1fr]">
                <div className="bg-white p-6">
                  <p className="text-xs text-[var(--muted)]">{p.buyer} · Order {p.order_ref}</p>
                  <p className="mt-2 text-[44px] font-extrabold leading-none tracking-tight">{p.kg_per_piece}<span className="ml-2 text-base font-semibold text-[var(--muted)]">kg CO₂e / পিস</span></p>
                  <p className="mt-3 text-sm">পুরো order: <b>{p.pieces.toLocaleString()} পিস = {p.order_tco2e} টন CO₂e</b></p>
                  {p.order_tco2e_range95 && <p className="mt-1 text-xs text-[var(--muted)]">৯৫% সম্ভাব্য সীমা: {p.order_tco2e_range95[0]} – {p.order_tco2e_range95[1]} টন (মিটার ও গুণকের অনিশ্চয়তা, Monte Carlo)</p>}
                  <p className="mt-1 text-xs text-[var(--muted)]">উৎপাদনের সময় {monthBn(p.period.from)} – {monthBn(p.period.to)} · Scope 1 {p.scope_split.scope1_pct}% · Scope 2 {p.scope_split.scope2_pct}%</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-6">
                  <div className="relative">
                    <svg viewBox="0 0 100 100" className="h-20 w-20 -rotate-90"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="9" /><circle cx="50" cy="50" r="42" fill="none" stroke="#1f8a5b" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(p.evidence.score / 100) * 263.9} 263.9`} /></svg>
                    <p className="absolute inset-0 grid place-items-center text-xl font-extrabold">{p.evidence.score}</p>
                  </div>
                  <div><p className="text-sm font-bold">Evidence Score</p><p className="text-xs text-[var(--muted)]">{p.evidence.grade} · {p.records}টা record থেকে</p></div>
                </div>
              </div>
              {/* যাচাইয়ের তিন স্তর */}
              <div className="border-t border-[var(--line)] p-6">
                <p className="text-xs font-bold text-[var(--leaf)]">যাচাইয়ের স্তর</p>
                <ol className="mt-2 grid gap-2 sm:grid-cols-3">
                  {[["System-এর হিসাব", true, null], ["কারখানার যাচাই", !!d.verification?.factory, d.verification?.factory], ["স্বাধীন যাচাই", !!d.verification?.independent, d.verification?.independent]].map(([t, ok, e], i) => (
                    <li key={t as string} className={`rounded-xl border p-3 text-xs ${ok ? "border-emerald-200 bg-emerald-50" : "border-dashed border-[var(--line)]"}`}>
                      <p className="font-semibold"><span className={ok ? "text-[var(--leaf)]" : "text-[var(--muted)]"}>{ok ? "✓" : i + 1}</span> {t as string}</p>
                      {e ? <p className="mt-1 text-[var(--muted)]">{(e as VE).reviewer} · {(e as VE).organization}<br />{(e as VE).scope}{(e as VE).reference ? ` · ${(e as VE).reference}` : ""}</p> : !ok ? <p className="mt-1 text-amber-700">এখনো হয়নি</p> : <p className="mt-1 text-[var(--muted)]">স্বাধীন যাচাই নয়</p>}
                    </li>
                  ))}
                </ol>
              </div>

              {p.reduction && (
                <div className="border-t border-[var(--line)] p-6">
                  <p className="text-xs font-bold text-[var(--leaf)]">নির্গমন কমানোর প্রমাণ (MRV)</p>
                  <p className="mt-1 text-sm"><b>{p.reduction.project}</b> · {monthBn(p.reduction.start)} থেকে</p>
                  <p className="mt-2 text-2xl font-extrabold">{p.reduction.claimed_tco2e} <span className="text-sm font-semibold text-[var(--muted)]">± {p.reduction.claimed_u90} টন CO₂e কম (৯০% আস্থা)</span></p>
                  <p className="text-xs text-[var(--muted)]">সব জ্বালানি মিলিয়ে নিট {p.reduction.net_tco2e} ± {p.reduction.net_u90} টন · প্রতি পিসে {p.reduction.intensity_change_pct > 0 ? "+" : ""}{p.reduction.intensity_change_pct}%{p.reduction.preliminary ? " · প্রাথমিক অনুমান" : ""}</p>
                  {p.reduction.leakage?.map((l: string) => <p key={l} className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">⚠ {l}</p>)}
                  <p className="mt-2 text-[11px] text-[var(--muted)]">{p.reduction.method}</p>
                </div>
              )}

              {p.risk && (
                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] px-6 py-4 text-sm">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.risk.level === "বেশি" ? "bg-red-100 text-red-800" : p.risk.level === "মাঝারি" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>ঝুঁকি {p.risk.score}/১০০ · {p.risk.level}</span>
                  <span className="text-xs text-[var(--muted)]">Audit অগ্রাধিকার: {p.risk.audit_priority} — এটা প্রতারণার প্রমাণ নয়, কোন তথ্য আগে যাচাই করা উচিত তার নির্দেশ</span>
                </div>
              )}

              <div className="grid gap-6 border-t border-[var(--line)] p-6 sm:grid-cols-[1fr_auto]">
                <div className="space-y-4 text-sm">
                  <div><p className="text-xs font-bold text-[var(--leaf)]">Factory</p><p>{p.factory.name}, {p.factory.location}{p.factory.demo && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">DEMO · synthetic</span>}</p></div>
                  <div><p className="text-xs font-bold text-[var(--leaf)]">পদ্ধতি</p><p className="text-[var(--muted)]">{p.method}{p.methodology_version ? ` · ${p.methodology_version}` : ""}</p></div>
                  {p.calculation_boundary && <div><p className="text-xs font-bold text-[var(--leaf)]">হিসাবের সীমা</p><p className="text-[var(--muted)]">{p.calculation_boundary}</p></div>}
                  {p.allocation && <div><p className="text-xs font-bold text-[var(--leaf)]">Order-এ ভাগের পদ্ধতি</p><p className="text-[var(--muted)]">প্রতি পিসে সমান ভাগ ({p.allocation.driver}) — {p.allocation.note}</p></div>}
                  <div><p className="text-xs font-bold text-[var(--leaf)]">গুণকের উৎস</p>
                    <ul className="mt-1 space-y-1 text-xs text-[var(--muted)]">{p.factors.map((f: any) => <li key={f.activity}><b className="text-[var(--ink)]">{FUEL[f.activity] ?? f.activity}:</b> {f.value} kg/{f.unit} — {f.source} ({f.license}{f.version ? `, v${f.version}` : ""}){f.proxy ? <span className="ml-1 rounded bg-amber-50 px-1 text-amber-800">proxy</span> : null}</li>)}</ul>
                  </div>
                </div>
                <div className="text-center"><div className="inline-block rounded-xl border border-[var(--line)] p-2"><QR text={url} className="h-32 w-32" /></div><p className="mt-1 text-[10px] text-[var(--muted)]">এই পাতার QR</p></div>
              </div>
              <div className="border-t border-[var(--line)] bg-[var(--paper)] px-6 py-4">
                <p className="text-[11px] text-[var(--muted)]">Passport hash (SHA-256)</p>
                <p className="break-all font-mono text-[11px]">{d.passport.hash}</p>
                <p className="mt-2 text-[11px] text-[var(--muted)]">তৈরি {new Date(d.passport.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} · ledger anchor <span className="font-mono">{d.passport.ledger_hash.slice(0, 16)}…</span></p>
              </div>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-white/45">{PASSPORT_DISCLAIMER}</p>
          </>
        )}
      </div>
    </main>
  );
}
