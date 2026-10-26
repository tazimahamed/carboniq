"use client";
import { useState } from "react";
import { ACTIVITY_LABEL, FACTORS } from "@/lib/factors";
import { parseBill } from "@/lib/parseBill";

type Result = { tonnes_co2e: number; formula: string; ledger_hash: string; scope: number };

export default function Upload() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [activity, setActivity] = useState("electricity");
  const [quantity, setQuantity] = useState("");
  const [month, setMonth] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function runOcr(file: File) {
    setPreview(URL.createObjectURL(file));
    setResult(null); setError("");
    setStatus("বিল পড়া হচ্ছে... (প্রথমবার ভাষার ফাইল নামাতে একটু সময় লাগে)");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(["ben", "eng"]);
    const { data } = await worker.recognize(file);
    await worker.terminate();
    setOcrText(data.text);
    const p = parseBill(data.text);
    if (p.kwh !== null) setQuantity(String(p.kwh));
    if (p.month) setMonth(p.month);
    setStatus(p.kwh !== null
      ? `পাওয়া গেছে (OCR confidence ${Math.round(data.confidence)}%) — মিলিয়ে নিশ্চিত করুন`
      : "সংখ্যা নিশ্চিতভাবে পাওয়া যায়নি — নিজে লিখে দিন");
  }

  async function confirm() {
    setError("");
    const unit = FACTORS.find((f) => f.activity === activity)!.unit;
    const res = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity, unit, quantity: Number(quantity), month }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "সমস্যা হয়েছে");
    else setResult(json);
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">বিল upload</h1>
      <input type="file" accept="image/*" capture="environment"
        onChange={(e) => e.target.files?.[0] && runOcr(e.target.files[0])}
        className="block" />
      {status && <p className="text-sm text-gray-600">{status}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        {preview && <img src={preview} alt="বিল" className="max-h-96 rounded border object-contain" />}
        <div className="space-y-3 rounded border bg-white p-4">
          <label className="block text-sm">ধরন
            <select value={activity} onChange={(e) => setActivity(e.target.value)} className="mt-1 w-full rounded border p-2">
              {FACTORS.map((f) => <option key={f.activity} value={f.activity}>{ACTIVITY_LABEL[f.activity]}</option>)}
            </select>
          </label>
          <label className="block text-sm">পরিমাণ
            <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm">মাস
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1 w-full rounded border p-2" />
          </label>
          <button onClick={confirm} disabled={!quantity || !month}
            className="w-full rounded bg-emerald-700 py-2 text-white disabled:opacity-40">
            নিশ্চিত করুন ও হিসাব করুন
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <div className="rounded bg-emerald-50 p-3 text-sm">
              <p className="text-lg font-bold">{result.tonnes_co2e} টন CO₂e (scope {result.scope})</p>
              <p>সূত্র: {result.formula}</p>
              <p className="break-all text-xs text-gray-500">Ledger hash: {result.ledger_hash}</p>
            </div>
          )}
        </div>
      </div>
      {ocrText && (
        <details className="text-xs text-gray-500"><summary>OCR-এর পুরো লেখা</summary><pre className="whitespace-pre-wrap">{ocrText}</pre></details>
      )}
    </section>
  );
}
