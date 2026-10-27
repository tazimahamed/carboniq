"use client";
// On-device LLM (WebLLM + Qwen2.5-1.5B-Instruct, Apache 2.0)। User-এর browser-এ WebGPU দিয়ে চলে — কোনো AI API নেই।
// কাজ শুধু template উত্তরকে স্বাভাবিক বাংলায় বলা; সংখ্যা বানানোর অনুমতি নেই (guardrail পরে যাচাই করে)।

export const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

type Engine = { chat: { completions: { create: (req: any) => Promise<any> } } };
let engine: Engine | null = null;
let loading: Promise<Engine> | null = null;

export function webgpuAvailable() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export async function loadModel(onProgress: (text: string, pct: number) => void): Promise<Engine> {
  if (engine) return engine;
  if (!loading) {
    loading = (async () => {
      const webllm = await import("@mlc-ai/web-llm");
      const e = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (r: { text: string; progress: number }) => onProgress(r.text, Math.round((r.progress ?? 0) * 100)),
      });
      engine = e as unknown as Engine;
      return engine;
    })().catch((err) => { loading = null; throw err; });
  }
  return loading;
}

const SYSTEM = `তুমি CarbonIQ BD-এর সহকারী, বাংলাদেশের garment factory-র কার্বন হিসাব নিয়ে বাংলায় উত্তর দাও।
নিয়ম:
১. শুধু FACTS-এ যা আছে তা ব্যবহার করবে। নিজে থেকে কোনো সংখ্যা, মাস বা তথ্য যোগ করবে না।
২. প্রতিটা সংখ্যা FACTS থেকে হুবহু নেবে।
৩. FACTS-এর প্রধান সংখ্যাটা (মোট টন) অবশ্যই উত্তরে লিখবে।
৪. ২ থেকে ৩টা ছোট বাক্যে, factory মালিকের সাথে কথা বলার মতো সহজ বাংলায় উত্তর দেবে।`;

export async function rephrase(question: string, facts: string): Promise<string> {
  if (!engine) throw new Error("model লোড হয়নি");
  const res = await engine.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `প্রশ্ন: ${question}\n\nFACTS:\n${facts}` },
    ],
    temperature: 0.2,
    max_tokens: 300,
  });
  return String(res?.choices?.[0]?.message?.content ?? "").trim();
}
