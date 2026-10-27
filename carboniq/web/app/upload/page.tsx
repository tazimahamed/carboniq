"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ACTIVITY_LABEL, FACTORS } from "@/lib/factors";
import { candidateNumbers, parseBill, type MeterCheck } from "@/lib/parseBill";
import { ACCEPT, ocrVariants, sha256Hex, toBillImage } from "@/lib/image";
import Shell from "@/components/Shell";

type Result = {
  tonnes_co2e: number; kg_co2e: number; formula: string; ledger_hash: string; scope: number; factor_source: string;
  evidence_level: string; evidence: { file_hash: string; meter_check?: MeterCheck | null } | null;
};

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function Upload() {
  const [file, setFile] = useState<Blob | null>(null);
  const [fileHash, setFileHash] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "reading" | "review" | "saving" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [meter, setMeter] = useState<MeterCheck | null>(null);
  const [ocrQty, setOcrQty] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<number[]>([]);
  const [activity, setActivity] = useState("electricity");
  const [quantity, setQuantity] = useState("");
  const [month, setMonth] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function runOcr(raw: File) {
    setResult(null); setError(""); setConfirmed(false); setOcrText(""); setMeter(null); setCandidates([]); setOcrQty(null);
    setPhase("reading"); setProgress(0);
    setStatus("ফাইল প্রস্তুত হচ্ছে...");
    let small: Blob;
    try {
      const out = await toBillImage(raw);
      small = out.blob;
      if (out.kind === "PDF" || out.kind === "HEIC") setStatus(`${out.kind} থেকে ছবি তৈরি হয়েছে...`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ফাইল খোলা যায়নি"); setPhase("idle"); setStatus(""); return;
    }
    setFile(small); setFileHash(await sha256Hex(small));
    setPreview(URL.createObjectURL(small));
    setStatus("ভাষার ফাইল প্রস্তুত হচ্ছে (প্রথমবার একটু সময় লাগে)...");
    try {
      const { createWorker } = await import("tesseract.js");
      let pass = 0;
      const worker = await createWorker(["ben", "eng"], 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") { setStatus(`বিল পড়া হচ্ছে (${pass + 1}/২)...`); setProgress(Math.round(((pass + m.progress) / 2) * 100)); }
        },
      });
      // টেবিলওয়ালা বিলের জন্য: পুরো পাতাকে একটা লেখার block ধরে পড়া
      await worker.setParameters({ tessedit_pageseg_mode: "6" as never });
      // দুই রকম পরিষ্কার করা ছবি — একটায় যা ভুল পড়ে, অন্যটায় প্রায়ই ঠিক আসে
      const variants = await ocrVariants(small);
      const texts: string[] = []; let conf = 0;
      for (const v of variants) {
        const { data } = await worker.recognize(v);
        texts.push(data.text); conf += data.confidence / variants.length; pass++;
      }
      await worker.terminate();
      setOcrText(texts.join("\n\n───── দ্বিতীয় পাঠ ─────\n\n")); setConfidence(Math.round(conf));
      const p = parseBill(texts);
      setMeter(p.meter);
      if (p.kwh !== null) { setQuantity(String(p.kwh)); setOcrQty(String(p.kwh)); setActivity("electricity"); }
      else setCandidates(candidateNumbers(texts));
      if (p.month) setMonth(p.month);
      setStatus(p.kwh !== null
        ? `সংখ্যা পাওয়া গেছে · OCR confidence ${Math.round(conf)}% — বিলের সাথে মিলিয়ে নিন`
        : "ব্যবহৃত ইউনিট নিশ্চিতভাবে পাওয়া যায়নি — নিচের সংখ্যা থেকে বাছুন বা নিজে লিখুন");
    } catch {
      setStatus("OCR চালানো যায়নি — সংখ্যা নিজে লিখে দিন");
    }
    setPhase("review");
  }

  async function confirm() {
    setError("");
    if (!confirmed) { setError("আগে ছবির সাথে সংখ্যা মিলিয়ে টিক দিন"); return; }
    const unit = FACTORS.find((f) => f.activity === activity)!.unit;
    setPhase("saving");
    let res: Response;
    if (file) {
      const fd = new FormData();
      fd.append("file", file, "bill.jpg");
      fd.append("file_hash", fileHash);
      fd.append("activity", activity); fd.append("unit", unit); fd.append("quantity", quantity); fd.append("month", month);
      fd.append("meta", JSON.stringify({
        ocr_confidence: confidence, edited_after_ocr: ocrQty !== null && ocrQty !== quantity,
        meter_check: meter ? { ...meter, ok: Math.abs(meter.expected - Number(quantity)) <= Math.max(1, Number(quantity) * 0.005) } : null,
      }));
      res = await fetch("/api/calculate", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/calculate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity, unit, quantity: Number(quantity), month }),
      });
    }
    const json = await res.json();
    if (!res.ok) { setError(json.error || "সমস্যা হয়েছে"); setPhase("review"); }
    else { setResult(json); setPhase("done"); }
  }

  function reset() {
    setFile(null); setFileHash(""); setPreview(null); setPhase("idle"); setQuantity(""); setMonth(""); setResult(null);
    setError(""); setConfirmed(false); setOcrText(""); setMeter(null); setCandidates([]); setOcrQty(null); setStatus("");
  }

  const unit = FACTORS.find((f) => f.activity === activity)?.unit;
  const steps = ["ছবি", "পড়া", "নিশ্চিত", "সিল"];
  const stepIdx = { idle: 0, reading: 1, review: 2, saving: 3, done: 4 }[phase];

  return (
    <Shell eyebrow="ধাপ ১" title="বিল upload" sub="ছবি আপনার device-এই পড়া হয় — মূল বিল প্রমাণ হিসেবে সংরক্ষিত ও hash-সিল হয়">
      <ol className="mb-8 flex items-center gap-2 text-sm">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition ${
              i < stepIdx ? "bg-[var(--leaf)] text-white" : i === stepIdx ? "bg-[var(--ink)] text-[var(--lime)] ring-4 ring-[var(--lime)]/30" : "bg-gray-200 text-gray-500"}`}>
              {i < stepIdx ? "✓" : i + 1}
            </span>
            <span className={i <= stepIdx ? "font-medium" : "text-gray-400"}>{s}</span>
            {i < steps.length - 1 && <span className={`h-px w-6 sm:w-12 ${i < stepIdx ? "bg-[var(--leaf)]" : "bg-gray-300"}`} />}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) runOcr(f); }}
          onClick={() => !preview && input.current?.click()}
          className={`relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
            drag ? "scale-[1.01] border-[var(--leaf)] bg-emerald-50" : preview ? "border-transparent bg-[var(--ink)]" : "cursor-pointer border-black/15 bg-white hover:border-[var(--leaf)] hover:bg-emerald-50/40"}`}>
          <input ref={input} type="file" accept={ACCEPT} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) runOcr(f); }} />
          {preview ? (
            <>
              <img src={preview} alt="বিল" className="max-h-[560px] w-full object-contain" />
              {phase === "reading" && <div className="scanline" />}
              <button onClick={(e) => { e.stopPropagation(); reset(); }}
                className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium shadow hover:bg-white">নতুন বিল</button>
              {fileHash && (
                <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 font-mono text-[10px] text-white/80" title={fileHash}>
                  SHA-256 {fileHash.slice(0, 12)}…
                </span>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--lime)]/30 text-3xl">⇪</div>
              <p className="mt-4 text-lg font-semibold">বিলের ছবি বা PDF এখানে টেনে আনুন</p>
              <p className="mt-1 text-sm text-gray-500">অথবা click করে বাছুন · phone-এ camera বা gallery</p>
              {error && phase === "idle" && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <p className="mt-4 text-xs text-gray-400">JPG · PNG · WebP · HEIC (iPhone) · PDF (e-bill) — সোজা করে, ভালো আলোয় তুলুন</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          {phase === "reading" ? (
            <div className="flex h-full flex-col justify-center">
              <p className="text-sm font-medium">{status}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[var(--leaf)] to-[var(--lime)] transition-all" style={{ width: `${Math.max(5, progress)}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-400">{progress}%</p>
            </div>
          ) : phase === "done" && result ? (
            <div>
              <div className="rounded-xl bg-[var(--ink)] p-5 text-white">
                <p className="text-sm text-white/60">Scope {result.scope} নির্গমন</p>
                <p className="mt-1 text-4xl font-bold text-[var(--lime)]">{fmt(result.tonnes_co2e)} <span className="text-lg">tCO₂e</span></p>
                <p className="mt-3 text-sm text-white/70">{result.formula} = {fmt(result.kg_co2e, 1)} kg</p>
                <p className="mt-1 text-xs text-white/40">গুণকের উৎস: {result.factor_source}</p>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p className="font-semibold">প্রমাণের স্তর</p>
                <Check ok label="L1 · মানুষ নিশ্চিত করেছেন" />
                <Check ok={!!result.evidence} label={result.evidence ? "L2 · মূল বিল সংযুক্ত ও সংরক্ষিত" : "L2 · মূল বিল সংযুক্ত নেই (হাতে লেখা)"} />
                {result.evidence?.meter_check && (
                  <Check ok={result.evidence.meter_check.ok}
                    label={result.evidence.meter_check.ok
                      ? `মিটার রিডিং মিলেছে: (${result.evidence.meter_check.present.toLocaleString()} − ${result.evidence.meter_check.previous.toLocaleString()}) × ${result.evidence.meter_check.multiplier} = ${result.evidence.meter_check.expected.toLocaleString()}`
                      : `মিটার রিডিং থেকে ${result.evidence.meter_check.expected.toLocaleString()} হয় — নিশ্চিত করা সংখ্যার সাথে মেলেনি`} />
                )}
                <Check ok label="L3 · Ledger-এ hash-সিল, পরে বদলানো যায় না" />
              </div>

              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
                {result.evidence && <p className="break-all font-mono text-emerald-800/70"><b className="font-sans text-emerald-900">বিলের hash:</b> {result.evidence.file_hash}</p>}
                <p className="mt-1 break-all font-mono text-emerald-800/70"><b className="font-sans text-emerald-900">Ledger hash:</b> {result.ledger_hash}</p>
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={reset} className="flex-1 rounded-full border py-2.5 text-sm font-medium transition hover:bg-black/5">আরেকটা বিল</button>
                <Link href="/dashboard" className="flex-1 rounded-full bg-[var(--forest)] py-2.5 text-center text-sm font-medium text-white transition hover:shadow-lg">Dashboard →</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {status && <p className={`rounded-lg px-3 py-2 text-sm ${status.includes("পাওয়া গেছে") ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{status}</p>}
              <div>
                <p className="mb-2 text-sm font-medium">ধরন</p>
                <div className="grid grid-cols-2 gap-2">
                  {FACTORS.map((f) => (
                    <button key={f.activity} onClick={() => setActivity(f.activity)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        activity === f.activity ? "border-[var(--leaf)] bg-emerald-50 ring-2 ring-[var(--leaf)]/20" : "border-black/10 hover:border-black/30"}`}>
                      {ACTIVITY_LABEL[f.activity]}
                      <span className="block text-[10px] text-gray-400">Scope {f.scope}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-sm font-medium">পরিমাণ
                <div className="mt-1 flex rounded-xl border border-black/10 focus-within:border-[var(--leaf)] focus-within:ring-2 focus-within:ring-[var(--leaf)]/20">
                  <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" placeholder="যেমন 120000"
                    className="w-full rounded-l-xl bg-transparent px-3 py-2.5 text-lg tabular-nums outline-none" />
                  <span className="grid place-items-center px-3 text-sm text-gray-400">{unit}</span>
                </div>
              </label>

              {candidates.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs text-gray-500">বিলে পাওয়া সংখ্যা — কোনটা ব্যবহৃত ইউনিট?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidates.map((n) => (
                      <button key={n} onClick={() => setQuantity(String(n))}
                        className={`rounded-full border px-3 py-1 text-xs tabular-nums transition ${quantity === String(n) ? "border-[var(--leaf)] bg-emerald-50" : "border-black/10 hover:border-[var(--leaf)]"}`}>
                        {n.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {meter && (() => {
                const f = (n: number) => n.toLocaleString("en-US");
                const calc = `(${f(meter.present)} − ${f(meter.previous)}) × ${meter.multiplier} = ${f(meter.expected)}`;
                const typedOk = !!quantity && Math.abs(meter.expected - Number(quantity)) <= Math.max(1, Number(quantity) * 0.005);
                if (meter.ok && typedOk) return (
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900"><b>✓ দুইভাবে মিলেছে:</b> বিলে ছাপা ইউনিট আর মিটার রিডিং {calc}</div>);
                if (meter.printed != null && !close(meter.printed, meter.expected)) return (
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900"><b>⚠ মেলেনি:</b> বিলে ছাপা {f(meter.printed)}, কিন্তু মিটার রিডিং থেকে {calc}। বিলটা ভালো করে দেখুন।</div>);
                return (
                  <div className={`rounded-xl px-3 py-2 text-xs ${typedOk ? "bg-sky-50 text-sky-900" : "bg-amber-50 text-amber-900"}`}>
                    <b>মিটার রিডিং থেকে হিসাব:</b> {calc}{typedOk ? " — বিলের সাথে মিলিয়ে নিন" : " ⚠ লেখা পরিমাণের সাথে মেলেনি"}
                  </div>);
              })()}

              <label className="block text-sm font-medium">মাস
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:border-[var(--leaf)] focus:ring-2 focus:ring-[var(--leaf)]/20" />
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-3 text-sm">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--leaf)]" />
                <span>আমি বিলের ছবির সাথে সংখ্যা মিলিয়ে দেখেছি <span className="block text-xs text-gray-500">নিশ্চিত না করা পর্যন্ত কোনো হিসাবে যায় না</span></span>
              </label>
              <button onClick={confirm} disabled={!quantity || !month || phase === "saving"}
                className="w-full rounded-full bg-[var(--ink)] py-3 font-semibold text-white transition enabled:hover:scale-[1.02] enabled:hover:shadow-xl disabled:opacity-30">
                {phase === "saving" ? "বিল সংরক্ষণ ও সিল করা হচ্ছে..." : "নিশ্চিত করুন ও হিসাব করুন"}
              </button>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {ocrText && (
        <details className="mt-6 rounded-2xl border border-black/5 bg-white p-4 text-xs text-gray-500">
          <summary className="cursor-pointer font-medium text-gray-700">OCR-এর পুরো লেখা</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap">{ocrText}</pre>
        </details>
      )}
    </Shell>
  );
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, b * 0.005);

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className="flex items-start gap-2">
      <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] text-white ${ok ? "bg-[var(--leaf)]" : "bg-amber-500"}`}>{ok ? "✓" : "!"}</span>
      <span className={ok ? "" : "text-amber-800"}>{label}</span>
    </p>
  );
}
