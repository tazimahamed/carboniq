"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import QR from "@/components/QR";
import { useRecords } from "@/lib/useRecords";
import { buyerShare, monthBn } from "@/lib/insights";
import VerificationLadder from "@/components/VerificationLadder";
import { verificationStatus, type VEvent } from "@/lib/verification";

type P = { id: string; buyer: string; order_ref: string; pieces: number; period_from: string; period_to: string; payload: { kg_per_piece: number; order_tco2e: number; evidence: { score: number } }; revoked: boolean; created_at: string };

export default function Passports() {
  const { rows, production, loading } = useRecords();
  const [list, setList] = useState<P[]>([]);
  const [origin, setOrigin] = useState("");
  const months = useMemo(() => Array.from(new Set(production.map((p) => p.period_month.slice(0, 7)))).sort(), [production]);
  const buyers = useMemo(() => Array.from(new Set(production.map((p) => p.buyer))), [production]);
  const [f, setF] = useState({ buyer: "", order_ref: "", pieces: "", from: "", to: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string; start: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [events, setEvents] = useState<VEvent[]>([]);
  const [chain, setChain] = useState<boolean | null>(null);
  const [verifyFor, setVerifyFor] = useState<string | null>(null);
  const loadEvents = () => fetch("/api/verifications?target_type=passport", { cache: "no-store" }).then((r) => r.json()).then((j) => { setEvents(j.events ?? []); setChain(j.chainValid ?? null); }).catch(() => {});

  const loadList = () => fetch("/api/passports", { cache: "no-store" }).then((r) => r.json()).then((j) => setList(j.passports ?? [])).catch(() => {});
  useEffect(() => {
    setOrigin(window.location.origin); loadList(); loadEvents();
    fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()).then((j) => setProjects(j.projects ?? [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (months.length && !f.from) setF((x) => ({ ...x, from: months[Math.max(0, months.length - 3)], to: months.at(-1)!, buyer: buyers[0] ?? "" }));
  }, [months, buyers, f.from]);

  const share = useMemo(() => (f.buyer && f.from && f.to ? buyerShare(rows, production, f.from, f.to) : []), [rows, production, f.buyer, f.from, f.to]);
  const mine = share.find((s) => s.buyer === f.buyer);
  const preview = mine && Number(f.pieces) > 0 ? (mine.kgPerPiece * Number(f.pieces)) / 1000 : null;

  async function create() {
    setErr(""); setBusy(true);
    try {
      const j = await fetch("/api/passports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, pieces: Number(f.pieces), project_id: projectId || undefined }) }).then((r) => r.json());
      if (j.error) setErr(j.error); else { setMade(j.id); loadList(); }
    } catch { setErr("Server উত্তর দেয়নি"); }
    setBusy(false);
  }
  async function revoke(id: string, revoked: boolean) {
    await fetch(`/api/passports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revoked }) });
    loadList();
  }
  const link = (id: string) => `${origin}/p/${id}`;
  const copy = (id: string) => navigator.clipboard?.writeText(link(id)).then(() => { setCopied(id); setTimeout(() => setCopied(""), 1500); });

  return (
    <Shell eyebrow="Share · buyer-এর জন্য" title="Carbon Passport" sub="একটা order-এর প্রতি পিস নির্গমন, প্রমাণসহ — QR দিয়ে buyer নিজেই যাচাই করতে পারে">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* তৈরি */}
        <div className="card p-6">
          <h2 className="font-bold">নতুন passport</h2>
          <p className="text-xs text-[var(--muted)]">কারখানার মাসিক নির্গমন buyer-দের মধ্যে উৎপাদিত পিসের অনুপাতে ভাগ হয়</p>
          {!loading && !production.length ? (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">উৎপাদনের ডেটা নেই। Supabase-এ <code>migration_2</code> চালিয়ে Dashboard থেকে <b>Demo reset</b> করুন।</p>
          ) : (
            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-1.5 text-sm font-medium">Buyer</p>
                <div className="flex flex-wrap gap-2">
                  {buyers.map((b) => (
                    <button key={b} onClick={() => setF({ ...f, buyer: b })} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${f.buyer === b ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] hover:border-[var(--leaf)]"}`}>{b}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Order নম্বর
                  <input value={f.order_ref} onChange={(e) => setF({ ...f, order_ref: e.target.value })} placeholder="যেমন NA-2026-0418" className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus:border-[var(--leaf)] focus:ring-2 focus:ring-leaf/20" />
                </label>
                <label className="text-sm font-medium">পিস
                  <input value={f.pieces} onChange={(e) => setF({ ...f, pieces: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="যেমন 40000" className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 tabular-nums outline-none focus:border-[var(--leaf)] focus:ring-2 focus:ring-leaf/20" />
                </label>
                <label className="text-sm font-medium">উৎপাদনের সময় — থেকে
                  <select value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5">{months.map((m) => <option key={m} value={m}>{monthBn(m)}</option>)}</select>
                </label>
                <label className="text-sm font-medium">পর্যন্ত
                  <select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5">{months.map((m) => <option key={m} value={m}>{monthBn(m)}</option>)}</select>
                </label>
              </div>
              {projects.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium">নির্গমন কমানোর প্রমাণ যুক্ত করবেন? <span className="font-normal text-[var(--muted)]">(ঐচ্ছিক, MRV থেকে)</span></p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setProjectId("")} className={`rounded-full border px-3 py-1.5 text-xs ${!projectId ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)]"}`}>না</button>
                    {projects.map((p) => <button key={p.id} onClick={() => setProjectId(p.id)} className={`rounded-full border px-3 py-1.5 text-xs ${projectId === p.id ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] hover:border-[var(--leaf)]"}`}>{p.name}</button>)}
                  </div>
                </div>
              )}
              {mine && (
                <div className="grid grid-cols-3 gap-3 rounded-xl bg-[var(--paper)] p-4 text-center">
                  <div><p className="text-lg font-extrabold">{mine.kgPerPiece.toFixed(3)}</p><p className="text-[11px] text-[var(--muted)]">kg CO₂e / পিস</p></div>
                  <div><p className="text-lg font-extrabold">{preview !== null ? preview.toFixed(2) : "—"}</p><p className="text-[11px] text-[var(--muted)]">এই order (টন)</p></div>
                  <div><p className="text-lg font-extrabold">{mine.tonnes.toFixed(1)}</p><p className="text-[11px] text-[var(--muted)]">{f.buyer}-এর ভাগ, এই সময়ে (টন)</p></div>
                </div>
              )}
              <button onClick={create} disabled={busy || !f.buyer || !f.order_ref || !f.pieces} className="w-full rounded-full bg-[var(--ink)] py-3 font-semibold text-white transition enabled:hover:opacity-90 disabled:opacity-30">
                {busy ? "তৈরি ও সিল করা হচ্ছে..." : "Passport তৈরি করুন"}
              </button>
              {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
            </div>
          )}
        </div>

        {/* সদ্য তৈরি / ব্যাখ্যা */}
        <div className="grain relative overflow-hidden rounded-[18px] bg-[var(--ink)] p-6 text-white">
          <div className="grid-bg absolute inset-0 opacity-50" />
          {made ? (
            <div className="relative flex flex-col items-center text-center">
              <p className="text-sm text-[var(--lime)]">✓ Passport তৈরি ও hash-সিল হয়েছে</p>
              <div className="mt-4 rounded-2xl bg-white p-3"><QR text={link(made)} className="h-44 w-44" /></div>
              <p className="mt-3 font-mono text-sm">{made}</p>
              <div className="mt-4 flex gap-2">
                <Link href={`/p/${made}`} className="btn-lime rounded-full px-5 py-2 text-sm font-bold">খুলে দেখুন →</Link>
                <button onClick={() => copy(made)} className="btn-ghost-dark rounded-full px-4 py-2 text-sm">{copied === made ? "✓ Copied" : "Link copy"}</button>
              </div>
              <p className="mt-4 max-w-xs text-xs text-white/50">এই QR shipment-এর কাগজে বা buyer-এর কাছে পাঠান। Scan করলে যে কেউ যাচাই করতে পারবে।</p>
            </div>
          ) : (
            <div className="relative">
              <h3 className="font-bold">Buyer কী দেখবে</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                {["প্রতি পিস আর পুরো order-এর নির্গমন", "কোন সময়ের বিল থেকে হিসাব, কোন গুণক", "Evidence Score আর প্রমাণের স্তর", "Hash মিলছে কিনা, ledger অক্ষত কিনা — live যাচাই", "আপনি বাতিল করলে সাথে সাথে \"বাতিল\" দেখাবে"].map((t) => (
                  <li key={t} className="flex gap-2"><span className="text-[var(--lime)]">✓</span>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* তালিকা */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-4"><h2 className="font-bold">তৈরি করা passport</h2><span className="rounded-full bg-[var(--paper)] px-2.5 py-0.5 text-xs text-[var(--muted)]">{list.length}টা</span></div>
        {list.length === 0 ? <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">এখনো কোনো passport নেই</p> : (
          <ul className="divide-y divide-[var(--line)]">
            {list.map((p) => (
              <li key={p.id} className={`flex flex-wrap items-center gap-4 px-5 py-3.5 ${p.revoked ? "opacity-50" : ""}`}>
                <div className="rounded-lg border border-[var(--line)] bg-white p-1"><QR text={link(p.id)} className="h-12 w-12" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.buyer} · {p.order_ref}{p.revoked && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">বাতিল</span>}</p>
                  <p className="text-xs text-[var(--muted)]">{p.pieces.toLocaleString()} পিস · {p.payload.kg_per_piece} kg/পিস · {p.payload.order_tco2e} টন · <span className="font-mono">{p.id}</span></p>
                </div>
                {(() => { const v = verificationStatus(events, "passport", p.id); return <span className={`rounded-full px-2 py-0.5 text-[10px] ${v.highest === "independent" ? "bg-emerald-100 text-emerald-800" : v.highest === "factory_review" ? "bg-sky-50 text-sky-800" : "bg-[var(--paper)] text-[var(--muted)]"}`}>{v.highest === "independent" ? "স্বাধীনভাবে যাচাইকৃত" : v.highest === "factory_review" ? "কারখানা যাচাই করেছে" : "শুধু system-এর হিসাব"}</span>; })()}
                <button onClick={() => setVerifyFor(verifyFor === p.id ? null : p.id)} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs hover:border-[var(--leaf)]">যাচাই</button>
                <Link href={`/p/${p.id}`} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs hover:border-[var(--leaf)]">দেখুন</Link>
                <button onClick={() => copy(p.id)} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs hover:border-[var(--leaf)]">{copied === p.id ? "✓" : "Link"}</button>
                <button onClick={() => revoke(p.id, !p.revoked)} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs hover:border-red-300 hover:text-red-700">{p.revoked ? "আবার চালু" : "বাতিল"}</button>
                {verifyFor === p.id && <div className="w-full"><VerificationLadder vs={verificationStatus(events, "passport", p.id)} targetType="passport" targetId={p.id} chain={chain} onAdded={loadEvents} /></div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
