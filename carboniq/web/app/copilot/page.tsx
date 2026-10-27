"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { compose, route, toolsFor, verifyNumbers, type ToolCall } from "@/lib/copilot";
import { loadModel, MODEL_ID, rephrase, webgpuAvailable } from "@/lib/llm";

type Msg = {
  role: "user" | "bot";
  text: string;
  calls?: ToolCall[];
  sources?: string[];
  mode?: "template" | "ai" | "ai-rejected";
  template?: string;
};

const SUGGEST = ["মোট নির্গমন কত?", "কোন মাসে সবচেয়ে বেশি?", "নভেম্বর ২০২৬-এর বিদ্যুৎ কীভাবে হিসাব হলো?", "মে মাসে কেন বাড়ল?", "Ledger কি অক্ষত?", "কোন গুণক ব্যবহার হয়েছে?", "Scope 1 মানে কী?"];

async function callTool(c: ToolCall): Promise<any> {
  const j = await fetch("/api/mcp", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: c }),
  }).then((r) => r.json());
  if (j.error) return j.error.message;
  if (j.result?.isError) return j.result.content?.[0]?.text ?? "tool error";
  return j.result?.structuredContent ?? j.result;
}

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <p key={i} className={line.trim() === "" ? "h-2" : ""}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") ? <b key={j}>{part.slice(2, -2)}</b> : <span key={j}>{part}</span>)}
        </p>
      ))}
    </>
  );
}

export default function Copilot() {
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: "bot", mode: "template",
    text: "আসসালামু আলাইকুম! আমি CarbonIQ Copilot। এই factory-র কার্বন হিসাব নিয়ে বাংলা বা English-এ প্রশ্ন করুন। প্রতিটা উত্তর আসল MCP tool থেকে, উৎসসহ।",
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<"off" | "loading" | "on" | "unsupported" | "failed">("off");
  const [aiProgress, setAiProgress] = useState({ text: "", pct: 0 });
  const [showTemplate, setShowTemplate] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!webgpuAvailable()) setAi("unsupported"); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  async function enableAi() {
    setAi("loading");
    try {
      await loadModel((text, pct) => setAiProgress({ text, pct }));
      setAi("on");
    } catch {
      setAi("failed");
    }
  }

  async function ask(q: string) {
    q = q.trim(); if (!q || busy) return;
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: q }]);
    try {
      const intent = route(q);
      const calls = toolsFor(intent);
      const results = await Promise.all(calls.map(callTool));
      const answer = compose(intent, results);
      let msg: Msg = { role: "bot", text: answer.text, calls, sources: answer.sources, mode: "template", template: answer.text };

      if (ai === "on" && calls.length && typeof results[0] === "object") {
        try {
          const out = await rephrase(q, answer.text);
          const check = verifyNumbers(out, [answer.text, JSON.stringify(results)]);
          msg = check.ok && out
            ? { ...msg, text: out, mode: "ai" }
            : { ...msg, mode: "ai-rejected" };
        } catch { /* AI ব্যর্থ হলে template-ই থাকে */ }
      }
      setMsgs((m) => [...m, msg]);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "দুঃখিত, server থেকে উত্তর আনা যায়নি। আবার চেষ্টা করুন।", mode: "template" }]);
    }
    setBusy(false);
  }

  return (
    <Shell eyebrow="AI Copilot · MCP" title="Carbon Copilot" sub="প্রশ্ন → MCP tool → আসল ledger থেকে উত্তর। কোনো সংখ্যা বানানো হয় না।"
      right={
        <div className="text-right">
          {ai === "off" && <button onClick={enableAi} className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition hover:scale-105">✦ On-device AI চালু করুন</button>}
          {ai === "loading" && <div className="w-64"><p className="truncate text-xs text-gray-500">{aiProgress.text || "Model নামানো হচ্ছে..."}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-[var(--leaf)] transition-all" style={{ width: `${Math.max(3, aiProgress.pct)}%` }} /></div></div>}
          {ai === "on" && <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-900">✦ On-device AI চালু · Qwen2.5-1.5B</span>}
          {ai === "unsupported" && <span className="text-xs text-gray-500">এই browser-এ WebGPU নেই — নিয়মভিত্তিক উত্তর চলবে</span>}
          {ai === "failed" && <span className="text-xs text-amber-700">AI model লোড হয়নি — নিয়মভিত্তিক উত্তর চলবে</span>}
        </div>
      }>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--forest)] px-4 py-2.5 text-sm text-white">{m.text}</div></div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--lime)] text-sm font-bold text-[var(--ink)]">C</span>
                <div className="max-w-[85%]">
                  <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 text-sm leading-relaxed"><Rich text={m.text} /></div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {m.calls?.map((c, k) => (
                      <span key={k} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-emerald-900" title={JSON.stringify(c.arguments)}>
                        MCP · {c.name}
                      </span>
                    ))}
                    {m.mode === "ai" && <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[var(--lime)]">✦ AI · সংখ্যা যাচাইকৃত ✓</span>}
                    {m.mode === "ai-rejected" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900" title="AI-এর উত্তরে এমন সংখ্যা ছিল যা ডেটায় নেই">⚠ AI-এর উত্তর বাতিল (সংখ্যা মেলেনি) — নির্ভরযোগ্য উত্তর দেখানো হলো</span>}
                    {m.mode === "ai" && m.template && (
                      <button onClick={() => setShowTemplate(showTemplate === i ? null : i)} className="text-gray-500 underline">মূল ডেটা</button>
                    )}
                  </div>
                  {showTemplate === i && m.template && <div className="mt-2 rounded-xl border border-dashed p-3 text-xs text-gray-600"><Rich text={m.template} /></div>}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--lime)] text-sm font-bold">C</span>
                <div className="flex items-center gap-1 rounded-2xl bg-gray-50 px-4 py-3">
                  {[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d * 120}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2 border-t p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="প্রশ্ন লিখুন... যেমন: অক্টোবরে কত নির্গমন হয়েছে?"
              className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-[var(--leaf)] focus:ring-2 focus:ring-[var(--leaf)]/20" />
            <button disabled={busy || !input.trim()} className="rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-white transition enabled:hover:scale-105 disabled:opacity-30">পাঠান</button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">চেষ্টা করুন</p>
            <div className="mt-3 flex flex-col gap-2">
              {SUGGEST.map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={busy}
                  className="rounded-xl border border-black/10 px-3 py-2 text-left text-sm transition hover:border-[var(--leaf)] hover:bg-emerald-50 disabled:opacity-40">{s}</button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--ink)] p-4 text-xs leading-relaxed text-white/75">
            <p className="mb-2 text-sm font-semibold text-white">কীভাবে কাজ করে</p>
            <p>১. প্রশ্ন বুঝে ঠিক MCP tool বাছে</p>
            <p>২. আসল ledger থেকে ডেটা আনে</p>
            <p>৩. নিয়ম অনুযায়ী উত্তর তৈরি</p>
            <p>৪. AI চালু থাকলে স্বাভাবিক বাংলায় বলে — কিন্তু তার উত্তরের প্রতিটা সংখ্যা ডেটার সাথে মেলানো হয়; না মিললে বাতিল</p>
            <p className="mt-2 text-white/50">Model: {MODEL_ID} (Apache 2.0) · আপনার browser-এ চলে · কোনো AI API নেই</p>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
