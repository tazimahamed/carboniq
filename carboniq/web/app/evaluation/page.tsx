"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
import results from "../../eval/results.json";

type Case = { name: string; pass: boolean; detail?: string };
type Suite = { id: string; title: string; what: string; cases: Case[]; passed: number; total: number };

const suites = results.suites as Suite[];
const summary = (results as unknown as { summary: { passed: number; total: number } }).summary;

const LIMITS = [
  { t: "আসল বিলে OCR — নমুনা এখনো ছোট", d: "এখন পর্যন্ত মাত্র একটা আসল বিলে (DESCO, জুন ২০২১) পরীক্ষা হয়েছে: এক রকম ছবিতে ইউনিট ভুল আসে, দুই রকম মিলিয়ে ঠিক আসে। DPDC, পল্লী বিদ্যুৎ, তিতাস গ্যাসের বিল আর আরো ছবিতে accuracy মাপা বাকি।" },
  { t: "On-device AI-এর গ্রহণযোগ্যতার হার", d: "Guardrail-এর নিয়ম পরীক্ষিত, কিন্তু browser-এ Qwen2.5-1.5B কত শতাংশ উত্তরে guardrail পাস করে তা এখনো মাপা হয়নি। ব্যর্থ হলে নির্ভরযোগ্য (নিয়মভিত্তিক) উত্তর দেখায়।" },
  { t: "Grid গুণক", d: "Ember-এর lifecycle intensity (৬৯৬ gCO₂e/kWh, ২০২৪) — রক্ষণশীল; শুধু দহনভিত্তিক গুণক এর চেয়ে কম হবে। T&D loss অন্তর্ভুক্ত নয়।" },
  { t: "Demo ডেটা", d: "Demo factory-র ১২ মাসের ডেটা synthetic (script দিয়ে তৈরি)। সব পাতায় DEMO চিহ্ন আছে।" },
];

export default function Evaluation() {
  const [open, setOpen] = useState<string | null>(null);
  const pct = Math.round((summary.passed / summary.total) * 100);
  const when = new Date(results.generated_at).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

  return (
    <Shell eyebrow="Evaluation" title="মাপা ফলাফল" sub="আসল code-এর উপর স্বয়ংক্রিয় পরীক্ষা — যা মাপা হয়নি তাও নিচে লেখা আছে">
      <div className="grid gap-4 md:grid-cols-[1.2fr_2fr]">
        <div className="rounded-lg bg-[var(--ink)] p-6 text-white">
          <p className="text-sm text-white/60">মোট পরীক্ষা পাস</p>
          <p className="mt-1 text-5xl font-bold text-[var(--lime)]">{summary.passed}<span className="text-2xl text-white/50">/{summary.total}</span></p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--lime)]" style={{ width: `${pct}%` }} /></div>
          <p className="mt-4 text-xs text-white/50">শেষ চালানো: {when} · {results.node}</p>
          <p className="mt-1 font-mono text-xs text-white/40">bash eval/run.sh</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {suites.map((s) => (
            <button key={s.id} onClick={() => setOpen(open === s.id ? null : s.id)}
              className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${open === s.id ? "border-[var(--leaf)]" : "border-[var(--line)]"}`}>
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

      {open && (() => {
        const s = suites.find((x) => x.id === open)!;
        return (
          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
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
            <div key={l.t} className="rounded-lg border border-amber-200/70 bg-amber-50/60 p-4">
              <p className="text-sm font-semibold text-amber-900">{l.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/80">{l.d}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
