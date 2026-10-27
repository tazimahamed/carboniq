import type { ReactNode } from "react";

/** ভেতরের পাতার মাথা — home-এর hero-র মতো গাঢ় সবুজ, grid আর আলো; নিচে কাজের অংশ */
export default function Shell({ eyebrow, title, sub, right, children }: {
  eyebrow: string; title: string; sub?: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <>
      <section className="grain relative overflow-hidden bg-[var(--ink)] text-white print:hidden">
        <div className="grid-bg absolute inset-0" />
        <div className="absolute -right-32 -top-40 h-[420px] w-[420px] rounded-full bg-[var(--leaf)]/25 blur-[110px]" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-end gap-6 px-4 pb-12 pt-32">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--lime)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime)]" />{eyebrow}
            </p>
            <h1 className="mt-3 text-[34px] font-bold leading-tight tracking-tight sm:text-[42px]">{title}</h1>
            {sub && <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-white/60">{sub}</p>}
          </div>
          <div className="ml-auto">{right}</div>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 print:p-0">{children}</main>
    </>
  );
}
