"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
import results from "../../eval/results.json";

type Case = { name: string; pass: boolean; detail?: string };
type Suite = { id: string; title: string; what: string; cases: Case[]; passed: number; total: number };

const suites = results.suites as Suite[];
const summary = (results as unknown as { summary: { passed: number; total: number } }).summary;

// চার ধরনের প্রমাণ আলাদা — কোনটা কোড ঠিক কিনা, কোনটা পুরো প্রবাহ, কোনটা আক্রমণ/ভুল তথ্য, কোনটা বৈজ্ঞানিক মান
const CATS = [
  { k: "unit", t: "Unit", d: "সূত্র, একক, hash, নিয়ম আলাদা করে", ids: ["engine", "ledger", "parser", "fuels", "evidence", "insights", "planner"] },
  { k: "integration", t: "Integration", d: "পুরো প্রবাহ: ছবি → OCR → হিসাব → ledger → passport/MCP/Copilot", ids: ["ocr", "real", "mcp", "routing", "copilot", "copilot2", "passport", "evidence_attach", "rag", "mcp_mrv"] },
  { k: "adversarial", t: "Adversarial", d: "বদলানো ledger, নকল বিল, গরমিল, বানানো সংখ্যা, অপ্রাসঙ্গিক প্রশ্ন", ids: ["guardrail", "risk", "verification"] },
  { k: "scientific", t: "Scientific", d: "জানা প্রভাব ফিরে পাওয়া, model fit, অনিশ্চয়তা, backtest (synthetic তথ্যে)", ids: ["mrv", "twin"] },
] as const;
const catOf = (id: string) => CATS.find((c) => (c.ids as readonly string[]).includes(id))?.k ?? "unit";

const LIMITS = [
  { t: "আসল বিলে OCR — নমুনা এখনো ছোট", d: "এখন পর্যন্ত মাত্র একটা আসল বিলে (DESCO, জুন ২০২১) পরীক্ষা হয়েছে: এক রকম ছবিতে ইউনিট ভুল আসে, দুই রকম মিলিয়ে ঠিক আসে। DPDC, পল্লী বিদ্যুৎ, তিতাস গ্যাসের বিল আর আরো ছবিতে accuracy মাপা বাকি।" },
  { t: "On-device AI-এর গ্রহণযোগ্যতার হার", d: "Guardrail-এর নিয়ম পরীক্ষিত, কিন্তু browser-এ Qwen2.5-1.5B কত শতাংশ উত্তরে guardrail পাস করে তা এখনো মাপা হয়নি। ব্যর্থ হলে নির্ভরযোগ্য (নিয়মভিত্তিক) উত্তর দেখায়।" },
  { t: "Grid গুণক", d: "Ember-এর lifecycle intensity (৬৯৬ gCO₂e/kWh, ২০২৪) — রক্ষণশীল; শুধু দহনভিত্তিক গুণক এর চেয়ে কম হবে। T&D loss অন্তর্ভুক্ত নয়।" },
  { t: "Demo ডেটা", d: "Demo factory-র ১২ মাসের ডেটা (বিল, উৎপাদন, buyer) synthetic। আগস্ট ২০২৬-এর গ্যাস অস্বাভাবিকতা আর জুলাই ২০২৬ থেকে বিদ্যুতে ৭% সাশ্রয় ইচ্ছাকৃত রাখা, যাতে সতর্কবার্তা আর MRV পরীক্ষা করা যায়। Scientific পরীক্ষাগুলো synthetic তথ্যে — আসল কারখানায় যাচাই বাকি।" },
  { t: "MRV-তে মাত্র ১২ মাস", d: "Baseline ৮ মাস, প্রকল্পের পরে ৪ মাস — তাই ফল 'প্রাথমিক অনুমান'। IPMVP সাধারণত পুরো এক বছরের baseline চায়। ডিজেলের model দুর্বল (load-shedding-নির্ভর), তাই নিট হিসাবে ধরা হয় না।" },
  { t: "Zone-ভাগ, solar, ঝুঁকির নিয়ম", d: "Twin-এর zone-ভাগ শিল্প-অনুমান; solar-এর প্যানেল-ঘনত্ব, performance ratio আর খরচ সাধারণ মান; ঝুঁকির নিয়মের পয়েন্ট আমাদের ঠিক করা (প্রতিটা ব্যাখ্যাসহ)। এগুলোর গণিত পরীক্ষিত, অনুমানগুলো আসল তথ্যে যাচাই বাকি।" },
  { t: "৳ সাশ্রয় আর প্রকল্পের অনুমান", d: "দাম (বিদ্যুৎ ৳১১/kWh, গ্যাস ৳৩০/m³, ডিজেল ৳১০৫/লিটার) আর প্রকল্পের খরচ-সাশ্রয় সাধারণ শিল্প-অনুমান; আসল প্রকল্পে energy audit আর BERC tariff লাগবে। Optimizer-এর গণিত পরীক্ষিত, অনুমানগুলো না।" },
];

export default function Evaluation() {
  const [open, setOpen] = useState<string | null>(null);
  const [cat, setCat] = useState<string>("all");
  const shown = suites.filter((s) => cat === "all" || catOf(s.id) === cat);
  const pct = Math.round((summary.passed / summary.total) * 100);
  const when = new Date(results.generated_at).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

  return (
    <Shell eyebrow="Evaluation" title="মাপা ফলাফল" sub="আসল code-এর উপর স্বয়ংক্রিয় পরীক্ষা — যা মাপা হয়নি তাও নিচে লেখা আছে">
      <div className="grid gap-4 md:grid-cols-[1.2fr_2fr]">
        <div className="grain relative self-start overflow-hidden rounded-[18px] bg-[var(--ink)] p-6 text-white">
          <p className="text-sm text-white/60">মোট পরীক্ষা পাস</p>
          <p className="mt-1 text-5xl font-bold text-[var(--lime)]">{summary.passed}<span className="text-2xl text-white/50">/{summary.total}</span></p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--lime)]" style={{ width: `${pct}%` }} /></div>
          <p className="mt-4 text-xs text-white/50">শেষ চালানো: {when} · {results.node}</p>
          <p className="mt-1 font-mono text-xs text-white/40">bash eval/run.sh</p>
        </div>
        <div>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATS.map((c) => { const xs = suites.filter((s) => catOf(s.id) === c.k), p = xs.reduce((a, s) => a + s.passed, 0), t = xs.reduce((a, s) => a + s.total, 0); return (
            <button key={c.k} onClick={() => setCat(cat === c.k ? "all" : c.k)} className={`rounded-2xl border p-3 text-left transition ${cat === c.k ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white hover:border-[var(--leaf)]"}`}>
              <p className="text-sm font-bold">{c.t} <span className="font-mono text-xs opacity-70">{p}/{t}</span></p><p className={`mt-0.5 text-[11px] leading-snug ${cat === c.k ? "text-white/70" : "text-[var(--muted)]"}`}>{c.d}</p>
            </button>); })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((s) => (
            <button key={s.id} onClick={() => setOpen(open === s.id ? null : s.id)}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${open === s.id ? "border-[var(--leaf)]" : "border-[var(--line)]"}`}>
              <div className="flex items-center gap-2">
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] text-white ${s.passed === s.total ? "bg-[var(--leaf)]" : "bg-amber-500"}`}>{s.passed === s.total ? "✓" : "!"}</span>
                <p className="text-sm font-semibold">{s.title}</p>
                <span className="ml-auto font-mono text-sm tabular-nums">{s.passed}/{s.total}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{s.what}</p>
            </button>
          ))}
        </div>
        </div>
      </div>

      {open && (() => {
        const s = suites.find((x) => x.id === open)!;
        return (
          <div className="mt-4 overflow-hidden card">
            <div className="flex items-center border-b px-5 py-3"><p className="font-semibold">{s.title}</p>
              <button onClick={() => setOpen(null)} className="ml-auto text-sm text-gray-400 hover:text-gray-700">বন্ধ ✕</button></div>
            <table className="w-full text-sm">
              <tbody>
                {s.cases.map((c, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="w-8 py-2 pl-5">{c.pass ? <span className="text-[var(--leaf)]">✓</span> : <span className="text-red-600">✗</span>}</td>
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 pr-5 text-right font-mono text-xs text-gray-400">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      <div className="mt-8">
        <h2 className="text-lg font-semibold">যা এখনো মাপা হয়নি বা সীমাবদ্ধতা</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {LIMITS.map((l) => (
            <div key={l.t} className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
              <p className="text-sm font-semibold text-amber-900">{l.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/80">{l.d}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
