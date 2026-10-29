"use client";
import { useState } from "react";
import { LEVELS, verificationStatus } from "@/lib/verification";

export default function VerificationLadder({ vs, targetType, targetId, chain, onAdded, disabled }: {
  vs: ReturnType<typeof verificationStatus>; targetType: string; targetId: string; chain: boolean | null; onAdded: () => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState<null | "factory_review" | "independent">(null);
  const ev = (k: string) => (k === "factory_review" ? vs.factory : k === "independent" ? vs.independent : null);
  return (
    <div className="card mt-4 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-bold">যাচাইয়ের তিন স্তর</h2>
        {chain !== null && <span className={`rounded-full px-2 py-0.5 text-[11px] ${chain ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{chain ? "যাচাই-ইতিহাস hash-chain অক্ষত" : "যাচাই-ইতিহাসে গরমিল"}</span>}
      </div>
      <p className="text-xs text-[var(--muted)]">একটা স্তর আরেকটাকে বোঝায় না — Evidence Score বেশি হলেও স্বাধীন যাচাই না হলে &quot;স্বাধীনভাবে যাচাইকৃত&quot; বলা যায় না</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {LEVELS.map((l, i) => {
          const e = ev(l.key), done = l.key === "calculated" || !!e;
          return (
            <li key={l.key} className={`relative rounded-2xl border p-4 ${done ? "border-leaf/40 bg-emerald-50/40" : "border-dashed border-[var(--line)]"}`}>
              <div className="flex items-center gap-2"><span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${done ? "bg-[var(--leaf)] text-white" : "bg-[var(--paper)] text-[var(--muted)]"}`}>{done ? "✓" : i + 1}</span><p className="font-semibold">{l.title}</p></div>
              <p className="mt-2 text-xs text-[var(--muted)]">{l.desc}</p>
              {e && <div className="mt-3 rounded-lg bg-white p-2.5 text-xs"><p><b>{e.reviewer}</b> · {e.organization}</p><p className="text-[var(--muted)]">পরিধি: {e.scope}</p>{e.reference && <p className="text-[var(--muted)]">রেফারেন্স: {e.reference}</p>}<p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{new Date(e.created_at).toLocaleDateString("en-GB")} · {e.hash.slice(0, 10)}…</p></div>}
              {!done && <p className="mt-3 text-xs font-semibold text-amber-700">এখনো হয়নি</p>}
              {l.key !== "calculated" && !disabled && <button onClick={() => setOpen(l.key as "factory_review" | "independent")} className="mt-3 text-xs font-semibold text-[var(--leaf)] hover:underline">{e ? "নতুন যাচাই যোগ করুন" : "যাচাই যোগ করুন"} →</button>}
            </li>
          );
        })}
      </ol>
      {open && <VerifyForm level={open} targetType={targetType} targetId={targetId} onClose={() => setOpen(null)} onAdded={() => { setOpen(null); onAdded(); }} />}
    </div>
  );
}

function VerifyForm({ level, targetType, targetId, onClose, onAdded }: { level: "factory_review" | "independent"; targetType: string; targetId: string; onClose: () => void; onAdded: () => void }) {
  const [v, setV] = useState({ reviewer: "", organization: "", scope: "", reference: "", statement: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const ind = level === "independent";
  async function save() {
    setBusy(true); setErr("");
    const j = await fetch("/api/verifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...v, level, target_type: targetType, target_id: targetId }) }).then((r) => r.json()).catch(() => ({ error: "সংযোগ ব্যর্থ" }));
    setBusy(false);
    if (j.error) setErr(j.error); else onAdded();
  }
  const F = (k: keyof typeof v, label: string, ph: string) => <label className="text-sm"><span className="font-semibold">{label}</span><input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} placeholder={ph} className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2" /></label>;
  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:grid-cols-2">
      <p className="text-sm font-bold sm:col-span-2">{ind ? "স্বাধীন যাচাই যোগ করুন" : "কারখানার যাচাই যোগ করুন"}</p>
      {F("reviewer", "যাচাইকারীর নাম", ind ? "যেমন: নিরীক্ষকের নাম" : "যেমন: Energy Manager-এর নাম")}
      {F("organization", "প্রতিষ্ঠান", ind ? "স্বাধীন যাচাই প্রতিষ্ঠান" : "Demo Knit Factory")}
      {F("scope", "কী যাচাই হয়েছে (পরিধি)", "যেমন: জুলাই–অক্টোবর ২০২৬-এর বিদ্যুৎ বিল ও মিটার")}
      {F("reference", ind ? "রিপোর্ট/সনদ রেফারেন্স (বাধ্যতামূলক)" : "রেফারেন্স (ঐচ্ছিক)", "রিপোর্ট নম্বর বা link")}
      <div className="sm:col-span-2">{F("statement", "মন্তব্য", "ঐচ্ছিক")}</div>
      {err && <p className="text-sm text-red-700 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2"><button onClick={onClose} className="flex-1 rounded-full border py-2 text-sm">বাতিল</button><button onClick={save} disabled={busy} className="flex-1 rounded-full bg-[var(--ink)] py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "…" : "সংরক্ষণ ও hash-সিল"}</button></div>
      <p className="text-[11px] text-[var(--muted)] sm:col-span-2">সংরক্ষণের পর বদলানো বা মোছা যায় না — নতুন যাচাই আলাদা ঘটনা হিসেবে যোগ হয়</p>
    </div>
  );
}
