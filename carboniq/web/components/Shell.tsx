import type { ReactNode } from "react";

/** ভেতরের পাতার জন্য একই রকম মাথা */
export default function Shell({ eyebrow, title, sub, right, children }: {
  eyebrow: string; title: string; sub?: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 print:pt-0">
      <div className="mb-8 flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--leaf)]">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {sub && <p className="mt-1 text-gray-600">{sub}</p>}
        </div>
        <div className="ml-auto">{right}</div>
      </div>
      {children}
    </main>
  );
}
