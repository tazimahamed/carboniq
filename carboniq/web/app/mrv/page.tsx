"use client";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { useRecords } from "@/lib/useRecords";
import { mrv, type FuelResult, type MrvProject } from "@/lib/mrv";
import { verificationStatus, type VEvent } from "@/lib/verification";
import VerificationLadder from "@/components/VerificationLadder";
import { monthBn } from "@/lib/insights";

const ACTS = [["electricity", "বিদ্যুৎ"], ["natural_gas", "গ্যাস"], ["diesel", "ডিজেল"], ["lpg", "LPG"]] as const;
const f1 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const f0 = (n: number) => Math.round(n).toLocaleString("en-US");

export default function MrvPage() {
  const { rows, production, loading } = useRecords();
  const [projects, setProjects] = useState<MrvProject[]>([]);
  const [needsMig, setNeedsMig] = useState(false);
  const [sel, setSel] = useState<string>("");
  const [events, setEvents] = useState<VEvent[]>([]);
  const [chain, setChain] = useState<boolean | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function loadProjects() {
    const j = await fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ projects: [] }));
    setProjects(j.projects ?? []); setNeedsMig(!!j.needsMigration);
    if (j.projects?.length && !sel) setSel(j.projects[0].id);
  }
  async function loadEvents() {
    const j = await fetch("/api/verifications?target_type=project", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ events: [] }));
    setEvents(j.events ?? []); setChain(j.chainValid ?? null);
  }
  useEffect(() => { loadProjects(); loadEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const project = projects.find((p) => p.id === sel) ?? null;
  const res = useMemo(() => (project && rows.length && production.length ? mrv(project, rows, production) : null), [project, rows, production]);
  const vs = project ? verificationStatus(events, "project", project.id) : null;

  if (!loading && !rows.length) return <Shell eyebrow="Verify · কমানো যাচাই" title="MRV"><p className="card p-6 text-sm text-[var(--muted)]">আগে Dashboard-এ Demo reset করুন বা বিল upload করুন।</p></Shell>;

  return (
    <Shell eyebrow="Verify · Measurement, Reporting & Verification" title="নির্গমন কমানো যাচাই (MRV)"
      sub="প্রকল্পের আগের মাসগুলো দিয়ে model শিখে দেখা হয় — প্রকল্প না করলে কত হতো, আর আসলে কত হলো">
      {needsMig && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">নতুন প্রকল্প আর যাচাই সংরক্ষণের জন্য Supabase-এ <code>migration_3_mrv_verification.sql</code> চালান। এখন demo প্রকল্পটা দেখানো হচ্ছে।</p>}

      {/* প্রকল্প বাছাই */}
      <div className="flex flex-wrap items-center gap-2">
        {projects.map((p) => (
          <button key={p.id} onClick={() => setSel(p.id)} className={`rounded-full border px-4 py-2 text-sm transition ${sel === p.id ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white hover:border-[var(--leaf)]"}`}>
            {p.name} <span className="opacity-60">· {monthBn(p.start)} থেকে</span>
          </button>
        ))}
        <button onClick={() => setShowNew((v) => !v)} className="rounded-full border border-dashed border-[var(--leaf)] px-4 py-2 text-sm font-semibold text-[var(--leaf)] hover:bg-emerald-50">+ নতুন প্রকল্প</button>
      </div>
      {showNew && <NewProject months={Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort()} onDone={(id) => { setShowNew(false); setSel(id); loadProjects(); }} />}
      {project && !project.id.startsWith("demo-") && (
        <button onClick={async () => { if (!confirm(`"${project.name}" প্রকল্প মুছবেন?`)) return; await fetch(`/api/projects?id=${encodeURIComponent(project.id)}`, { method: "DELETE" }); setSel(""); loadProjects(); }} className="mt-2 text-xs text-red-600 hover:underline">এই প্রকল্প মুছুন</button>
      )}

      {res && project && res.post.months === 0 && (
        <div className="card mt-5 p-6 text-sm"><p className="font-bold text-amber-800">যাচাই করা যাচ্ছে না</p><p className="mt-1 text-[var(--muted)]">{res.verdict}</p></div>
      )}

      {res && project && res.post.months > 0 && (
        <>
          {/* মূল ফল */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="grain relative overflow-hidden rounded-[18px] bg-[var(--ink)] p-6 text-white">
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-leaf/30 blur-3xl" />
              <div className="relative flex flex-wrap items-center gap-2">
                <StatusBadge status={res.status} />
                {res.preliminary && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80">প্রাথমিক অনুমান — ১২ মাসের কম তথ্য</span>}
              </div>
              <p className="relative mt-4 text-sm text-white/60">প্রকল্পের জ্বালানিতে কমেছে ({project.activities.map((a) => ACTS.find((x) => x[0] === a)?.[1]).join(", ")})</p>
              <p className="relative mt-1 text-[44px] font-extrabold leading-none text-[var(--lime)]">{f1(res.claimedT)} <span className="text-lg font-bold text-white/80">± {f1(res.claimedUT)} টন CO₂e</span></p>
              <p className="relative mt-1 text-xs text-white/50">৯০% আস্থা-সীমা · {monthBn(res.post.from)} – {monthBn(res.post.to)} ({res.post.months} মাস)</p>
              <div className="relative mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm">
                <div><p className="text-white/55">সব জ্বালানি মিলিয়ে নিট</p><p className={`mt-0.5 text-2xl font-bold ${res.netT < res.claimedT - 0.05 ? "text-amber-300" : ""}`}>{f1(res.netT)} <span className="text-sm font-normal text-white/60">± {f1(res.netUT)} t</span></p></div>
                <div><p className="text-white/55">Baseline</p><p className="mt-0.5 font-semibold">{monthBn(res.baseline.from)} – {monthBn(res.baseline.to)}</p><p className="text-xs text-white/45">{res.baseline.months} মাস</p></div>
              </div>
              <p className="relative mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs leading-relaxed text-white/80">{res.verdict}</p>
            </div>

            {/* তিনটা metric আলাদা */}
            <div className="card p-6">
              <h2 className="font-bold">তিনটা মাপ আলাদা</h2>
              <p className="text-xs text-[var(--muted)]">মোট কমা মানেই দক্ষতা বাড়া নয় — তিনটা একসাথে দেখতে হয়</p>
              <Metric label="সমন্বিত সাশ্রয় (উৎপাদন ও আবহাওয়া মিলিয়ে)" value={`${f1(res.claimedT)} t`} good={res.claimedT > res.claimedUT} note="আসল প্রকল্প-প্রভাব — এটাই দাবির ভিত্তি" />
              <Metric label="প্রতি পিসে নির্গমন" value={`${res.intensity.changePct > 0 ? "+" : ""}${res.intensity.changePct.toFixed(1)}%`} good={res.intensity.changePct < 0} note={`${res.intensity.baseKgPerPiece.toFixed(3)} → ${res.intensity.postKgPerPiece.toFixed(3)} kg/পিস`} />
              <Metric label="মাসিক গড় মোট নির্গমন" value={`${res.intensity.absChangePct > 0 ? "+" : ""}${res.intensity.absChangePct.toFixed(1)}%`} good={res.intensity.absChangePct < 0} note="ঋতু আর উৎপাদন বদলালে এটা বিভ্রান্তিকর হতে পারে" />
            </div>
          </div>

          {/* চার্ট */}
          {res.fuels.filter((f) => f.inProject && f.modelOk).map((f) => <MrvChart key={f.activity} f={f} start={project.start} />)}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Leakage / rebound */}
            <div className="card p-6">
              <h2 className="font-bold">Leakage ও rebound যাচাই</h2>
              <p className="text-xs text-[var(--muted)]">এক জায়গায় কমে অন্য জায়গায় বাড়লে আসল কমানো কম</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <Check ok={!res.leakage.length} text={res.leakage.length ? "অন্য জ্বালানিতে প্রত্যাশার চেয়ে বেশি ব্যবহার পাওয়া গেছে" : "অন্য কোনো যাচাইযোগ্য জ্বালানিতে বাড়তি ব্যবহার নেই"} />
                {res.leakage.map((l) => <li key={l.activity} className="ml-6 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{l.text}</li>)}
                <Check ok={res.intensity.changePct <= 0} text={res.intensity.changePct <= 0 ? "প্রতি পিসে নির্গমনও কমেছে — শুধু উৎপাদন কমার ফল নয়" : "প্রতি পিসে নির্গমন বেড়েছে — দক্ষতা বাড়েনি"} />
                {res.unverifiable.map((u) => <li key={u} className="flex gap-2 text-xs text-[var(--muted)]"><span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gray-300 text-[10px] text-white">?</span>{u} — নিট হিসাবে ধরা হয়নি</li>)}
              </ul>
            </div>

            {/* Model মান */}
            <div className="card p-6">
              <h2 className="font-bold">Baseline model কতটা ভালো</h2>
              <p className="text-xs text-[var(--muted)]">ASHRAE Guideline 14-এর regression baseline মানদণ্ড (মাসিক তথ্য): CV(RMSE) ≤ ২০%, |NMBE| ≤ ৫% হলে model গ্রহণযোগ্য</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-[var(--muted)]"><th className="py-1.5">জ্বালানি</th><th>চলক</th><th className="text-right">R²</th><th className="text-right">CV(RMSE)</th><th className="text-right">ফল</th></tr></thead>
                  <tbody>
                    {res.fuels.map((f) => (
                      <tr key={f.activity} className="border-t border-[var(--line)]">
                        <td className="py-2 font-medium">{f.label}{f.inProject && <span className="ml-1 text-[10px] text-[var(--leaf)]">প্রকল্প</span>}</td>
                        <td className="text-xs text-[var(--muted)]">{f.fit?.features.join(" + ") ?? "—"}</td>
                        <td className="text-right tabular-nums">{f.fit ? f.fit.r2.toFixed(2) : "—"}</td>
                        <td className="text-right tabular-nums">{f.fit ? `${(f.fit.cvrmse * 100).toFixed(1)}%` : "—"}</td>
                        <td className="text-right">{f.modelOk ? <span className="text-[var(--leaf)]">✓ পাস</span> : <span className="text-amber-700">✗ দুর্বল</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* যাচাইয়ের তিন স্তর */}
          {vs && <VerificationLadder vs={vs} targetType="project" targetId={project.id} chain={chain} onAdded={loadEvents} disabled={needsMig} />}

          <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
            পদ্ধতি: IPMVP Option C-র ধারণা (পুরো কারখানার মাসিক বিল) — baseline মাসগুলোতে ব্যবহার = b₀ + b₁·উৎপাদন (+ b₂·তাপমাত্রা) least-squares; প্রকল্পের পরের মাসে "adjusted baseline" থেকে আসল ব্যবহার বাদ দিয়ে সাশ্রয়। অনিশ্চয়তা OLS prediction variance থেকে (প্রতি মাসের noise + coefficient-এর অনিশ্চয়তা), ৯০% t-বণ্টন; জ্বালানিগুলোর অনিশ্চয়তা স্বাধীন ধরে বর্গমূলে যোগ। গুণক: প্রতিটা record-এ সিল করা মান। এটা IPMVP-অনুসারী পদ্ধতি, IPMVP সনদ নয়; demo তথ্য synthetic (জুলাই ২০২৬ থেকে বিদ্যুতে ৭% কম বসানো — model সেটা কতটা ফিরে পায় তা Eval-এ পরীক্ষিত)।
          </p>
        </>
      )}
    </Shell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, [string, string]> = {
    "verified-savings": ["পরিমাপে নিশ্চিত সাশ্রয়", "bg-[var(--lime)] text-[var(--ink)]"],
    "not-significant": ["পরিসংখ্যানগতভাবে নিশ্চিত নয়", "bg-amber-300 text-amber-950"],
    "insufficient-data": ["তথ্য যথেষ্ট নয়", "bg-white/20 text-white"],
  };
  const [t, c] = m[status] ?? m["insufficient-data"];
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${c}`}>{t}</span>;
}

function Metric({ label, value, good, note }: { label: string; value: string; good: boolean; note: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 border-t border-[var(--line)] pt-4 first-of-type:border-0">
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{label}</p><p className="text-xs text-[var(--muted)]">{note}</p></div>
      <p className={`text-xl font-extrabold tabular-nums ${good ? "text-[var(--leaf)]" : "text-amber-700"}`}>{value}</p>
    </div>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return <li className="flex gap-2"><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] text-white ${ok ? "bg-[var(--leaf)]" : "bg-amber-500"}`}>{ok ? "✓" : "!"}</span><span className={ok ? "" : "text-amber-900"}>{text}</span></li>;
}

/** আসল বনাম "প্রকল্প না করলে" — baseline-এ model-এর fit, পরে ৯০% সীমাসহ */
function MrvChart({ f, start }: { f: FuelResult; start: string }) {
  const pts = [...f.baseMonths.map((m) => ({ month: m.month, actual: m.actual, exp: m.fitted, lo: m.fitted, hi: m.fitted, post: false })), ...f.months.map((m) => ({ month: m.month, actual: m.actual, exp: m.expected, lo: m.lo, hi: m.hi, post: true }))];
  const W = 1000, H = 280, L = 70, R = 16, T = 20, B = 36;
  const vals = pts.flatMap((p) => [p.actual, p.lo, p.hi]);
  const lo = Math.min(...vals) * 0.96, hi = Math.max(...vals) * 1.03;
  const x = (i: number) => L + (i / Math.max(1, pts.length - 1)) * (W - L - R);
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const si = pts.findIndex((p) => p.post);
  const line = (k: "actual" | "exp", from = 0) => pts.slice(from).map((p, i) => `${i ? "L" : "M"}${x(i + from).toFixed(1)},${y(p[k]).toFixed(1)}`).join("");
  const band = si >= 0 ? pts.slice(si).map((p, i) => `${i ? "L" : "M"}${x(si + i)},${y(p.hi)}`).join("") + pts.slice(si).reverse().map((p, i) => `L${x(pts.length - 1 - i)},${y(p.lo)}`).join("") + "Z" : "";
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <div className="card mt-4 p-6">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div><h2 className="font-bold">{f.label}: আসল বনাম &quot;প্রকল্প না করলে&quot;</h2><p className="text-xs text-[var(--muted)]">{f.unit} প্রতি মাসে · সবুজ ছায়া = ৯০% সম্ভাব্য সীমা</p></div>
        <div className="ml-auto flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-[var(--ink)]" />আসল বিল</span>
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 border-t-2 border-dashed border-[var(--leaf)]" />model (প্রকল্প না করলে)</span>
          <span className="font-semibold text-[var(--leaf)]">সাশ্রয় {f0(f.savedQty)} ± {f0(f.uQty)} {f.unit}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="MRV chart">
        {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.07} /><text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{(v / 1000).toFixed(0)}k</text></g>)}
        {si > 0 && <><rect x={x(si) - (x(1) - x(0)) / 2} y={T} width={W - R - x(si) + (x(1) - x(0)) / 2} height={H - T - B} fill="var(--leaf)" opacity={0.04} />
          <line x1={x(si) - (x(1) - x(0)) / 2} x2={x(si) - (x(1) - x(0)) / 2} y1={T} y2={H - B} stroke="var(--leaf)" strokeDasharray="4 4" />
          <text x={x(si) - (x(1) - x(0)) / 2 + 6} y={T + 12} fontSize="12" fill="var(--leaf)" fontWeight="700">প্রকল্প শুরু · {monthBn(start)}</text></>}
        {band && <path d={band} fill="var(--leaf)" opacity={0.16} />}
        <path d={line("exp")} fill="none" stroke="var(--leaf)" strokeWidth={2.5} strokeDasharray="7 6" />
        <path d={line("actual")} fill="none" stroke="var(--ink)" strokeWidth={2.5} />
        {pts.map((p, i) => <circle key={p.month} cx={x(i)} cy={y(p.actual)} r={4} fill={p.post ? "var(--ink)" : "#fff"} stroke="var(--ink)" strokeWidth={2}><title>{`${p.month}: আসল ${f0(p.actual)}, model ${f0(p.exp)}`}</title></circle>)}
        {pts.map((p, i) => <text key={p.month + "t"} x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--muted)">{p.month.slice(2).replace("-", "/")}</text>)}
      </svg>
    </div>
  );
}

function NewProject({ onDone, months }: { onDone: (id: string) => void; months: string[] }) {
  const [name, setName] = useState(""), [start, setStart] = useState(""), [acts, setActs] = useState<string[]>(["electricity"]), [capex, setCapex] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setErr("");
    const j = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, start, activities: acts, capexTk: capex ? Number(capex) : null }) }).then((r) => r.json()).catch(() => ({ error: "সংযোগ ব্যর্থ" }));
    setBusy(false);
    if (j.error) setErr(j.error); else onDone(j.id);
  }
  return (
    <div className="card mt-3 grid gap-3 p-5 sm:grid-cols-2">
      <label className="text-sm"><span className="font-semibold">প্রকল্পের নাম</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: Boiler economizer" className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2" /></label>
      <label className="text-sm"><span className="font-semibold">কবে চালু হয়েছে</span><input type="month" value={start} min={months[6]} max={months.at(-1)} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2" /><span className="mt-1 block text-[11px] text-[var(--muted)]">{months.length >= 7 ? `${months[6]} থেকে ${months.at(-1)}-এর মধ্যে (আগে ≥৬ মাস, পরে ≥১ মাস বিল লাগে)` : "যাচাইয়ের জন্য কমপক্ষে ৭ মাসের বিল লাগে"}</span></label>
      <div className="text-sm"><span className="font-semibold">কোন জ্বালানিতে প্রভাব</span>
        <div className="mt-1 flex flex-wrap gap-2">{ACTS.map(([k, l]) => <button key={k} onClick={() => setActs((a) => a.includes(k) ? a.filter((x) => x !== k) : [...a, k])} className={`rounded-full border px-3 py-1.5 text-xs ${acts.includes(k) ? "border-[var(--leaf)] bg-emerald-50" : "border-[var(--line)]"}`}>{l}</button>)}</div>
        {/বয়লার|boiler|steam|স্টিম|economi/i.test(name) && !acts.includes("natural_gas") && <p className="mt-1 text-[11px] text-amber-700">বয়লার/steam প্রকল্প সাধারণত গ্যাস কমায় — &quot;গ্যাস&quot; বাছুন</p>}
      </div>
      <label className="text-sm"><span className="font-semibold">বিনিয়োগ (৳, ঐচ্ছিক)</span><input inputMode="numeric" value={capex} onChange={(e) => setCapex(e.target.value.replace(/[^\d]/g, ""))} className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2" /></label>
      {err && <p className="text-sm text-red-700 sm:col-span-2">{err}</p>}
      <button onClick={save} disabled={busy} className="rounded-full bg-[var(--ink)] py-2.5 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-2">{busy ? "সংরক্ষণ হচ্ছে…" : "প্রকল্প যোগ করুন"}</button>
    </div>
  );
}

