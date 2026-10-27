import type { ReactNode } from "react";

/** অ্যাপের ভেতরের প্রতিটা পাতার মাথা: ছোট পথ-নির্দেশ, শিরোনাম, ব্যাখ্যা, ডানে কাজের বোতাম */
export default function Shell({ eyebrow, title, sub, right, children }: {
  eyebrow: string; title: string; sub?: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 lg:px-10 lg:pt-10 print:p-0">
      <div className="mb-8 flex flex-wrap items-end gap-4 border-b border-[var(--line)] pb-6 print:hidden">
        <div className="min-w-0">
          <p className="text-[13px] text-[var(--muted)]">{eyebrow}</p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
          {sub && <p className="mt-1.5 max-w-2xl text-[15px] text-[var(--muted)]">{sub}</p>}
        </div>
        <div className="ml-auto">{right}</div>
      </div>
      {children}
    </main>
  );
}
