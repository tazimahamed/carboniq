import type { ReactNode } from "react";

/**
 * কাজের পাতার মাথা — home-এর বড় hero না, একটা ছোট গাঢ় পাত।
 * ব্র্যান্ড একই (গাঢ় সবুজ, lime), কিন্তু জায়গা কম নেয় যাতে কাজের অংশ উপরে থাকে।
 */
export default function Shell({ eyebrow, title, sub, right, children, wide = false }: {
  eyebrow: string; title: string; sub?: string; right?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  const w = wide ? "max-w-7xl" : "max-w-6xl";
  return (
    <>
      <section className="relative overflow-hidden bg-[var(--ink)] text-white print:hidden">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[var(--leaf)]/25 blur-[90px]" />
        <div className={`relative mx-auto flex ${w} flex-wrap items-center gap-4 px-4 pb-7 pt-24`}>
          <div className="min-w-0">
            <p className="text-[13px] text-white/50">{eyebrow}</p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">{title}</h1>
            {sub && <p className="mt-1 max-w-2xl text-[14px] text-white/55">{sub}</p>}
          </div>
          <div className="ml-auto">{right}</div>
        </div>
      </section>
      <main className={`mx-auto ${w} px-4 pb-20 pt-8 print:max-w-none print:p-0`}>{children}</main>
    </>
  );
}
