"use client";
import { useState } from "react";

export type MethodRow = { k: string; v: string; src?: string; est?: boolean };

/** পদ্ধতি ও অনুমান — ছোট "ⓘ" বোতাম, খুললে পরিপাটি টেবিল (লম্বা অনুচ্ছেদের বদলে) */
export default function Method({ rows, title = "পদ্ধতি ও উৎস", dark = false, className = "" }: { rows: MethodRow[]; title?: string; dark?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const est = rows.filter((r) => r.est).length;
  return (
    <div className={`text-xs ${className}`}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition ${dark ? "border-white/15 text-white/70 hover:bg-white/10" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--leaf)] hover:text-[var(--ink)]"}`}>
        <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold ${dark ? "bg-white/15 text-white" : "bg-[var(--paper)] text-[var(--ink)]"}`}>i</span>
        {title}{est ? <span className={dark ? "text-amber-300" : "text-amber-700"}> · {est}টা অনুমান</span> : null}
        <span className={`transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className={`mt-2 overflow-hidden rounded-xl border ${dark ? "border-white/10 bg-white/[0.04]" : "border-[var(--line)] bg-white"}`}>
          <table className="w-full">
            <tbody>
              {rows.map((r) => (
                <tr key={r.k} className={`border-t first:border-0 ${dark ? "border-white/10" : "border-[var(--line)]"}`}>
                  <td className={`w-40 px-3 py-2 align-top font-semibold ${dark ? "text-white/80" : ""}`}>{r.k}</td>
                  <td className={`px-3 py-2 align-top ${dark ? "text-white/70" : "text-[var(--ink)]"}`}>
                    {r.v}
                    {r.src && <span className={`mt-0.5 block text-[11px] ${dark ? "text-white/45" : "text-[var(--muted)]"}`}>{r.src}</span>}
                  </td>
                  <td className="w-20 px-3 py-2 text-right align-top">{r.est ? <span className={`rounded px-1.5 py-0.5 text-[10px] ${dark ? "bg-amber-300/15 text-amber-200" : "bg-amber-50 text-amber-800"}`}>অনুমান</span> : r.src ? <span className={`rounded px-1.5 py-0.5 text-[10px] ${dark ? "bg-emerald-300/15 text-emerald-200" : "bg-emerald-50 text-emerald-800"}`}>উৎস</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
