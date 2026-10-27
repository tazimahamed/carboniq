"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";

const SAMPLES: { tool: string; label: string; args: Record<string, unknown> }[] = [
  { tool: "get_emissions", label: "মোট নির্গমন", args: { group_by: "total" } },
  { tool: "get_emissions", label: "মাসভিত্তিক (২০২৬)", args: { from: "2026-01", to: "2026-12" } },
  { tool: "explain_calculation", label: "নভেম্বর ২০২৬-এর বিদ্যুৎ ব্যাখ্যা", args: { month: "2026-11", activity: "electricity" } },
  { tool: "verify_ledger", label: "Ledger যাচাই", args: {} },
  { tool: "get_factors", label: "গুণকের উৎস", args: {} },
];

export default function Developers() {
  const [origin, setOrigin] = useState("");
  const [tools, setTools] = useState<{ name: string; description: string }[]>([]);
  const [active, setActive] = useState(0);
  const [req, setReq] = useState("");
  const [res, setRes] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) })
      .then((r) => r.json()).then((j) => setTools(j.result?.tools ?? [])).catch(() => {});
  }, []);

  async function run(i: number) {
    setActive(i); setBusy(true);
    const s = SAMPLES[i];
    const body = { jsonrpc: "2.0", id: Date.now() % 1000, method: "tools/call", params: { name: s.tool, arguments: s.args } };
    setReq(JSON.stringify(body, null, 2));
    try {
      const j = await fetch("/api/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
      setRes(JSON.stringify(j.result?.structuredContent ?? j.result ?? j.error, null, 2));
    } catch { setRes("উত্তর পাওয়া যায়নি"); }
    setBusy(false);
  }

  const endpoint = `${origin || "https://your-site.vercel.app"}/api/mcp`;
  const config = JSON.stringify({ mcpServers: { "carboniq-bd": { command: "npx", args: ["-y", "mcp-remote", endpoint] } } }, null, 2);
  const curl = `curl -X POST ${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_emissions","arguments":{"group_by":"total"}}}'`;

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(""), 1500); }).catch(() => {});
  }

  return (
    <Shell eyebrow="API · MCP" title="Developers ও AI agent" sub="Buyer বা auditor-এর নিজের AI agent সরাসরি প্রমাণসহ সংখ্যা পড়তে পারে">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Protocol", "Model Context Protocol", "JSON-RPC 2.0 · Streamable HTTP"],
          ["Endpoint", "/api/mcp", "POST · stateless · CORS খোলা"],
          ["নিরাপত্তা", "Read-only", "লেখার কোনো tool নেই · token ঐচ্ছিক"],
        ].map(([k, v, s]) => (
          <div key={k} className="card p-5">
            <p className="text-[13px] font-medium text-[var(--muted)]">{k}</p>
            <p className="mt-1 text-lg font-bold">{v}</p>
            <p className="mt-1 text-xs text-gray-500">{s}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="min-w-0 space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold">Tool ({tools.length || 4}টা)</h2>
            <ul className="mt-3 space-y-3">
              {tools.map((t) => (
                <li key={t.name}>
                  <p className="font-mono text-sm font-semibold text-[var(--leaf)]">{t.name}</p>
                  <p className="text-xs leading-relaxed text-gray-600">{t.description}</p>
                </li>
              ))}
              {!tools.length && <li className="text-sm text-gray-400">লোড হচ্ছে...</li>}
            </ul>
          </div>

          <div className="card p-5">
            <div className="flex items-center"><h2 className="font-semibold">Claude Desktop বা অন্য MCP client-এ যুক্ত করুন</h2>
              <button onClick={() => copy(config, "cfg")} className="ml-auto rounded-full border px-3 py-1 text-xs hover:bg-black/5">{copied === "cfg" ? "✓ Copied" : "Copy"}</button></div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-[var(--ink)] p-4 text-xs text-white/80">{config}</pre>
            <div className="mt-4 flex items-center"><h3 className="text-sm font-semibold">অথবা সরাসরি HTTP</h3>
              <button onClick={() => copy(curl, "curl")} className="ml-auto rounded-full border px-3 py-1 text-xs hover:bg-black/5">{copied === "curl" ? "✓ Copied" : "Copy"}</button></div>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-gray-50 p-4 text-xs text-gray-700">{curl}</pre>
          </div>
        </div>

        <div className="card min-w-0 p-5">
          <h2 className="font-semibold">চালিয়ে দেখুন (live)</h2>
          <p className="text-xs text-gray-500">আসল MCP endpoint-এ request যায়, আসল ledger থেকে উত্তর আসে</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SAMPLES.map((s, i) => (
              <button key={i} onClick={() => run(i)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${active === i && req ? "border-[var(--leaf)] bg-emerald-50" : "border-black/10 hover:border-[var(--leaf)]"}`}>
                {s.label}
              </button>
            ))}
          </div>
          {req ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Request →</p>
                <pre className="max-h-40 overflow-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-700">{req}</pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">← Response {busy && "(অপেক্ষা...)"}</p>
                <pre className="max-h-[420px] overflow-auto rounded-xl bg-[var(--ink)] p-3 text-xs text-white/85">{busy ? "..." : res}</pre>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border-2 border-dashed border-black/10 p-10 text-center text-sm text-gray-400">উপরের যেকোনো একটা বোতাম চাপুন</div>
          )}
        </div>
      </div>
    </Shell>
  );
}
