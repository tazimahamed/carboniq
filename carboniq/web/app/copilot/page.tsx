"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { compose, factsFor, route, toolsFor, verifyAi, type ToolCall } from "@/lib/copilot";
import { loadModel, MODEL_ID, rephrase, webgpuAvailable } from "@/lib/llm";

type Msg = {
  role: "user" | "bot";
  text: string;
  calls?: ToolCall[];
  sources?: string[];
  mode?: "template" | "ai";
  template?: string;
};

const SUGGEST = ["মোট নির্গমন কত?", "প্রকল্পে কত কমেছে?", "মোট নির্গমন কতটা নিশ্চিত?", "প্রতি পিসে কত?", "কোনো সমস্যা আছে?", "IPMVP Option C কীভাবে কাজ করে?", "বিদ্যুতের গুণক কেন 0.696?", "Ledger কি অক্ষত?"];

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
    text: "আসসালামু আলাইকুম! আমি CarbonIQ Copilot। আপনার factory-র নির্গমন, মাসভিত্তিক পরিবর্তন বা কোনো হিসাবের প্রমাণ নিয়ে প্রশ্ন করুন।",
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<"off" | "loading" | "on" | "unsupported" | "failed">("off");
  const [aiProgress, setAiProgress] = useState({ text: "", pct: 0 });
  const [showTemplate, setShowTemplate] = useState<number | null>(null);
  // ---- বাংলা voice: browser-এর নিজস্ব speech (কোনো API খরচ নেই) ----
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [voiceOk, setVoiceOk] = useState({ mic: false, tts: false });
  const recRef = useRef<any>(null);
  useEffect(() => {
    const w = window as any;
    setVoiceOk({ mic: !!(w.SpeechRecognition || w.webkitSpeechRecognition), tts: "speechSynthesis" in w });
  }, []);
  function listen() {
    const w = window as any, SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = "bn-BD"; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results as ArrayLike<any>).map((r: any) => r[0].transcript).join("");
      setInput(t);
      if (e.results[e.results.length - 1].isFinal) { rec.stop(); ask(t); }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; setListening(true); rec.start();
  }
  function say(text: string) {
    if (!speak || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, "").replace(/[•✓⚠]/g, "").slice(0, 600));
    const bn = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("bn"));
    u.lang = "bn-BD"; if (bn) u.voice = bn; u.rate = 1;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  }
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!webgpuAvailable()) setAi("unsupported"); }, []); // সমর্থন না থাকলে বোতামই দেখায় না
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

      // AI শুধু তখন, যখন উত্তরে যাচাই করার মতো মূল সংখ্যা আছে। যাচাই ব্যর্থ হলে চুপচাপ নির্ভরযোগ্য উত্তরই দেখায়।
      if (ai === "on" && answer.key?.length && typeof results[0] === "object") {
        try {
          const out = await rephrase(q, factsFor(answer));
          const check = verifyAi(out, answer, results);
          if (check.ok) msg = { ...msg, text: out, mode: "ai" };
          else console.debug("[copilot] AI উত্তর বাতিল:", check.reason, out);
        } catch { /* AI ব্যর্থ হলে template-ই থাকে */ }
      }
      setMsgs((m) => [...m, msg]);
      say(msg.text);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "দুঃখিত, server থেকে উত্তর আনা যায়নি। আবার চেষ্টা করুন।", mode: "template" }]);
    }
    setBusy(false);
  }

  return (
    <Shell eyebrow="AI Copilot · MCP" title="Carbon Copilot" sub="বাংলা বা English-এ প্রশ্ন করুন — প্রতিটা উত্তর যাচাইযোগ্য ledger থেকে"
      right={
        <div className="text-right" title={`${MODEL_ID} · Apache 2.0 · আপনার browser-এ চলে, কোনো AI API নেই`}>
          {ai === "off" && <button onClick={enableAi} className="btn-ghost-dark rounded-full px-4 py-2 text-sm font-medium transition">✦ AI উত্তর চালু করুন</button>}
          {ai === "loading" && <div className="w-56"><p className="text-xs text-white/60">AI প্রস্তুত হচ্ছে · {aiProgress.pct}%</p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-[var(--leaf)] transition-all" style={{ width: `${Math.max(3, aiProgress.pct)}%` }} /></div></div>}
          {ai === "failed" && <button onClick={enableAi} className="text-xs text-white/60 hover:underline">AI চালু হয়নি · আবার চেষ্টা করুন</button>}
          {ai === "on" && <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/15 px-3 py-1.5 text-xs font-medium text-[var(--lime)]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />AI চালু</span>}
        </div>
            }>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex h-[640px] flex-col overflow-hidden card">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-md bg-[var(--ink)] px-4 py-2.5 text-sm text-white shadow-sm">{m.text}</div></div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--ink)] text-sm font-bold text-[var(--lime)]">C</span>
                <div className="max-w-[85%]">
                  <div className="rounded-2xl rounded-tl-md border border-[var(--line)] bg-paper/70 px-4 py-3 text-sm leading-relaxed"><Rich text={m.text} /></div>
                  {m.sources?.some((x) => x.startsWith("kb:")) && (
                    <div className="mt-1.5 flex flex-wrap gap-2 pl-1 text-[11px]">
                      {m.sources.filter((x) => x.startsWith("kb:")).map((x) => { const u = x.slice(3); return <a key={u} href={u} target={u.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="rounded-full border border-[var(--line)] bg-white px-2.5 py-0.5 text-[var(--leaf)] hover:border-[var(--leaf)]">📄 মূল দলিল ↗</a>; })}
                      <span className="text-gray-400">জ্ঞানভান্ডার থেকে খোঁজা (BM25, browser-এ)</span>
                    </div>
                  )}
                  {m.calls && m.calls.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2 pl-1 text-[11px] text-gray-400">
                      <span title={m.calls.map((c) => `${c.name} ${JSON.stringify(c.arguments)}`).join("\n")}>
                        উৎস: hash-সিল করা ledger
                      </span>
                      {m.mode === "ai" && (
                        <>
                          <span>·</span>
                          <span title="On-device AI দিয়ে লেখা; প্রতিটা সংখ্যা ledger-এর সাথে মিলিয়ে দেখা হয়েছে">✦ AI</span>
                          <button onClick={() => setShowTemplate(showTemplate === i ? null : i)} className="hover:text-gray-600 hover:underline">
                            {showTemplate === i ? "লুকান" : "বিস্তারিত"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {showTemplate === i && m.template && <div className="mt-2 rounded-xl border border-[var(--line)] bg-white p-3 text-xs text-gray-600"><Rich text={m.template} /></div>}
                </div>
              </div>
            ))}
            {msgs.length === 1 && !busy && (
              <div className="pt-6">
                <p className="text-center text-xs text-[var(--muted)]">যেমন জিজ্ঞেস করতে পারেন</p>
                <div className="mx-auto mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
                  {[["মোট নির্গমন কত?", "১২ মাসের মোট, scope অনুযায়ী"], ["প্রতি পিসে কত?", "buyer-এর আসল প্রশ্ন"], ["কোনো সমস্যা আছে?", "অস্বাভাবিকতা ও জেনারেটর"], ["Evidence Score কত?", "ডেটা কতটা প্রমাণসহ"]].map(([q, h]) => (
                    <button key={q} onClick={() => ask(q)} className="rounded-xl border border-[var(--line)] bg-white p-3 text-left transition hover:border-leaf/50 hover:bg-[var(--paper)]">
                      <span className="block text-sm font-semibold">{q}</span><span className="block text-xs text-[var(--muted)]">{h}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {busy && (
              <div className="flex gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--ink)] text-sm font-bold text-[var(--lime)]">C</span>
                <div className="flex items-center gap-1 rounded-2xl bg-gray-50 px-4 py-3">
                  {[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d * 120}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2 border-t p-3">
            {voiceOk.mic && (
              <button type="button" onClick={listen} title="বাংলায় বলুন" aria-label="বাংলায় বলুন"
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${listening ? "animate-pulse border-red-300 bg-red-50 text-red-600" : "border-[var(--line)] hover:border-[var(--leaf)]"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              </button>
            )}
            {voiceOk.tts && (
              <button type="button" onClick={() => { setSpeak((v) => !v); window.speechSynthesis?.cancel(); }} title={speak ? "উত্তর শোনা বন্ধ" : "উত্তর শুনুন"} aria-pressed={speak}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${speak ? "border-[var(--leaf)] bg-emerald-50 text-[var(--leaf)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--leaf)]"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" />{speak ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /> : <path d="M17 9l4 6M21 9l-4 6" />}</svg>
              </button>
            )}
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? "শুনছি... বাংলায় বলুন" : "প্রশ্ন লিখুন বা mic চেপে বলুন..."}
              className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-[var(--leaf)] focus:ring-2 focus:ring-leaf/20" />
            <button disabled={busy || !input.trim()} className="btn-lime rounded-full px-5 text-sm font-bold transition disabled:opacity-30">পাঠান</button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <p className="text-sm font-semibold">চেষ্টা করুন</p>
            <div className="mt-3 flex flex-col gap-2">
              {SUGGEST.map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={busy}
                  className="rounded-xl border border-black/10 px-3 py-2 text-left text-sm transition hover:border-[var(--leaf)] hover:bg-emerald-50 disabled:opacity-40">{s}</button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
