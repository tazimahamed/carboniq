import Link from "next/link";
import { CountUp, Reveal, Spotlight, TiltCard } from "@/components/fx";
import { LogoMark } from "@/components/Nav";

const P = {
  camera: "M4 8h3l2-3h6l2 3h3v11H4V8zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  scan: "M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M7 12h10",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5V11z",
  doc: "M6 2h9l5 5v15H6V2zm8 0v6h6M9 13h7M9 17h7",
  ocr: "M4 6h16M4 12h10M4 18h7M17 15l2 2 3-4",
  chain: "M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1",
  sigma: "M18 5H6l6 7-6 7h12",
  flag: "M5 21V4h10l-1 4h6v9h-9l1-4H5",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-9 9h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
  plug: "M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0V7zm5 9v5",
  meter: "M4 15a8 8 0 1 1 16 0M12 15l4-5M3 19h18",
  files: "M8 3h8l4 4v12H8V3zM4 7v14h12",
};
const Ico = ({ d, className = "h-5 w-5" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

const STEPS = [
  { i: P.camera, t: "বিলের ছবি তুলুন", d: "Phone-এর camera, iPhone-এর HEIC বা email-এর PDF। ছবি আপনার device-এই পড়া হয়।" },
  { i: P.scan, t: "AI পড়ে, আপনি নিশ্চিত করেন", d: "বাংলা ও English OCR সংখ্যা বের করে, মিটার রিডিং দিয়ে মিলিয়ে দেখে। আপনি এক click-এ নিশ্চিত করেন।" },
  { i: P.lock, t: "হিসাব ও hash-সিল", d: "সরকারি গুণকে scope ১ ও ২ হিসাব, মূল বিলসহ প্রতিটা record SHA-256 chain-এ সিল — পরে বদলানো যায় না।" },
  { i: P.doc, t: "Buyer-ready report", d: "উৎস, গুণক, version আর ledger hash-সহ PDF — buyer বা auditor-কে পাঠানোর জন্য প্রস্তুত।" },
];

const FEATURES = [
  { i: P.ocr, t: "On-device OCR", d: "বাংলা + English, browser-এই চলে। DESCO-র dot-matrix বিলও দুই রকম ছবি মিলিয়ে পড়ে।" },
  { i: P.meter, t: "মিটার যাচাই", d: "বিলে ছাপা ইউনিট আর (বর্তমান − পূর্ববর্তী রিডিং) আলাদা করে মেলায় — ভুল বা নকল বিল ধরে।" },
  { i: P.chain, t: "Evidence ledger", d: "প্রতিটা সংখ্যার পেছনে বিল, গুণক, উৎস আর hash। Auditor এক click-এ যাচাই করেন।" },
  { i: P.sigma, t: "নিরীক্ষাযোগ্য হিসাব", d: "হিসাবে AI নেই — কার্যক্রম × গুণক। একই input-এ সবসময় একই ফল।" },
  { i: P.flag, t: "ডুপ্লিকেট আটকায়", d: "একই মাসের বা একই ছবির বিল দুবার দিলে ধরে ফেলে, যাতে কিছু দুবার গোনা না হয়।" },
  { i: P.globe, t: "সরকারি গুণক", d: "UK DESNZ 2026 (OGL) আর Ember-এর বাংলাদেশ grid intensity, version সহ।" },
  { i: P.user, t: "Human gate", d: "AI যা পড়ে, মানুষ নিশ্চিত না করা পর্যন্ত কোনো হিসাবে যায় না।" },
  { i: P.plug, t: "MCP server", d: "Buyer-এর AI agent সরাসরি প্রমাণসহ সংখ্যা পড়তে পারে — get_emissions, explain_calculation।" },
  { i: P.files, t: "যেকোনো বিল", d: "ছবি, HEIC বা PDF — বিদ্যুৎ, গ্যাস, ডিজেল, LPG সব এক জায়গায়।" },
];

const BARS = [62, 58, 63, 70, 80, 88, 92, 88, 84, 80, 76, 70];

function ProductPreview() {
  return (
    <div className="floaty relative mx-auto w-full max-w-[460px]">
      {/* app window */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e2a1f]/90 shadow-[0_40px_80px_-30px_rgba(0,0,0,.8)] backdrop-blur">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-white/40">carboniq / dashboard</span>
        </div>
        <div className="grid grid-cols-[1fr_1.15fr] gap-3 p-4">
          {/* বিল scan */}
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="scanline" />
            <p className="text-[11px] text-white/50">বিদ্যুৎ বিল · নভে ২০২৬</p>
            <div className="mt-3 space-y-1.5">{[80, 95, 60, 85, 70].map((w, i) => <div key={i} className="h-1.5 rounded bg-white/10" style={{ width: `${w}%` }} />)}</div>
            <div className="mt-3 rounded-lg border border-[var(--lime)]/40 bg-[var(--lime)]/10 px-2.5 py-2">
              <p className="text-[10px] text-white/55">ব্যবহৃত ইউনিট</p>
              <p className="text-[15px] font-bold text-[var(--lime)]">126,500 kWh</p>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-emerald-300"><Ico d="M5 12l4 4 10-10" className="h-3 w-3" />মিটার রিডিং মিলেছে</p>
          </div>
          {/* mini dashboard */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] text-white/50">মোট নির্গমন · ১২ মাস</p>
            <p className="mt-1 text-[22px] font-extrabold tracking-tight text-white">2,126.1<span className="ml-1 text-[11px] font-semibold text-[var(--lime)]">tCO₂e</span></p>
            <div className="mt-3 flex h-20 items-end gap-[3px]">
              {BARS.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col overflow-hidden rounded-t-[3px]" style={{ height: `${h}%` }}>
                  <div className="bg-[#7ee0a8]/70" style={{ height: "45%" }} /><div className="flex-1 bg-[var(--lime)]/85" />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-white/35"><span>নভে</span><span>মে</span><span>অক্টো</span></div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5 font-mono text-[10.5px] text-white/45">
          <Ico d={P.chain} className="h-3.5 w-3.5 text-[var(--lime)]" />
          <span>a65eff8d35</span><span className="text-white/20">→</span><span>48a4415f52</span><span className="text-white/20">→</span><span className="text-[var(--lime)]">5ea4071f2d</span>
          <span className="ml-auto text-emerald-300">ledger ✓</span>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-6 rounded-xl border border-white/10 bg-[var(--forest)] px-4 py-3 shadow-2xl">
        <p className="text-[11px] text-white/55">126,500 × 0.696</p>
        <p className="font-bold text-white">88.04 টন CO₂e</p>
      </div>
      <div className="absolute -right-3 -top-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-xl">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--leaf)]" />Hash-সিলকৃত
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <Spotlight className="grain relative overflow-hidden bg-[var(--ink)] text-white">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_80%)]" />
        <div className="absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-[var(--leaf)]/30 blur-[130px]" />
        <div className="absolute -left-40 bottom-0 h-[380px] w-[380px] rounded-full bg-[var(--lime)]/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-36 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] text-white/80">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--lime)] opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--lime)]" /></span>
                বাংলাদেশের garment শিল্পের জন্য
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-7 text-[44px] font-bold leading-[1.1] tracking-tight sm:text-[64px]">
                বিলের ছবি থেকে <span className="text-glow">buyer-ready</span> কার্বন report
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-white/65">
                Upload করুন, AI পড়ে নেবে, আপনি নিশ্চিত করবেন — আর প্রতিটা সংখ্যার প্রমাণসহ scope ১ ও ২ নির্গমনের হিসাব, hash-সিল করা।
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/upload" className="btn-lime group rounded-full px-7 py-3.5 text-[15px] font-bold transition">
                  বিল upload করুন <span className="inline-block transition group-hover:translate-x-1">→</span>
                </Link>
                <Link href="/dashboard" className="btn-ghost-dark rounded-full px-7 py-3.5 text-[15px] font-medium transition">Demo dashboard দেখুন</Link>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-white/45">
                {["GHG Protocol", "UK DESNZ 2026", "Ember", "SHA-256 ledger"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><Ico d="M5 12l4 4 10-10" className="h-3.5 w-3.5 text-[var(--lime)]" />{t}</span>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={200}><ProductPreview /></Reveal>
        </div>

        {/* সংখ্যা */}
        <div className="relative border-t border-white/10 bg-black/10">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-white/10 px-4 md:grid-cols-4 md:divide-x">
            {[
              { v: 14000, s: "+", l: "উৎপাদন কেন্দ্র Higg FEM ব্যবহার করে" },
              { v: 149, s: "/149", l: "স্বয়ংক্রিয় পরীক্ষা পাস" },
              { v: 256, s: "-bit", l: "SHA hash chain-এ সিল" },
              { v: 0, s: " ৳", l: "AI API খরচ — সব device-এ চলে" },
            ].map((x) => (
              <div key={x.l} className="px-0 py-8 md:px-8 md:first:pl-0">
                <p className="text-[34px] font-extrabold tracking-tight text-[var(--lime)]"><CountUp to={x.v} suffix={x.s} /></p>
                <p className="mt-1 text-sm text-white/55">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </Spotlight>

      {/* উৎসের সারি */}
      <div className="overflow-hidden border-b border-[var(--line)] bg-white py-5">
        <div className="marquee flex w-max gap-12 whitespace-nowrap text-sm font-medium text-gray-500">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["UK DESNZ 2026 · OGL v3.0", "Ember · CC-BY-4.0", "GHG Protocol", "Global Solar Atlas · CC BY 4.0", "Tesseract OCR", "SHA-256 Ledger", "Model Context Protocol", "বাংলা ও English"]
              .map((t) => <span key={`${k}-${t}`} className="flex items-center gap-12">{t}<span className="text-[var(--leaf)]">✦</span></span>))}
        </div>
      </div>

      {/* পাঁচ ধাপের platform */}
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <Reveal>
            <p className="text-sm font-semibold text-[var(--leaf)]">একটা পূর্ণ platform</p>
            <h2 className="mt-2 max-w-3xl text-[34px] font-bold leading-tight tracking-tight sm:text-[42px]">মাপা থেকে buyer-এর হাতে প্রমাণ — পাঁচ ধাপে</h2>
          </Reveal>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--line)] md:grid-cols-5">
            {[
              { k: "Measure", t: "মাপা", d: "বিল OCR, উৎপাদন, scope ১ ও ২, প্রতি পিস নির্গমন", href: "/upload", i: P.scan },
              { k: "Verify", t: "যাচাই", d: "মিটার রিডিং, hash-ledger আর ০-১০০ Evidence Score", href: "/dashboard", i: P.lock },
              { k: "Detect", t: "ধরা", d: "প্রত্যাশার চেয়ে বেশি ব্যবহার, load-shedding-এ জেনারেটরের বাড়তি খরচ", href: "/dashboard", i: P.meter },
              { k: "Optimize", t: "কমানো", d: "বাজেট দিলে সেরা প্রকল্প-সমন্বয়, ৳ সাশ্রয় আর payback", href: "/planner", i: P.sigma },
              { k: "Share", t: "দেওয়া", d: "Order-ভিত্তিক Carbon Passport, QR দিয়ে buyer নিজে যাচাই করে", href: "/passports", i: P.chain },
            ].map((x, i) => (
              <Reveal key={x.k} delay={i * 70}>
                <Link href={x.href} className="group flex h-full flex-col bg-white p-6 transition-colors hover:bg-[var(--paper)]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ink)] text-[var(--lime)]"><Ico d={x.i} /></span>
                  <p className="mt-5 text-xs font-bold text-[var(--leaf)]">{x.k}</p>
                  <h3 className="mt-0.5 text-[20px] font-bold">{x.t}</h3>
                  <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[var(--muted)]">{x.d}</p>
                  <span className="mt-4 text-sm font-semibold text-[var(--forest)] transition group-hover:translate-x-1">দেখুন →</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* কীভাবে কাজ করে */}
      <section className="mx-auto max-w-6xl px-4 py-28">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-[var(--leaf)]">কীভাবে কাজ করে</p>
              <h2 className="mt-2 max-w-2xl text-[34px] font-bold leading-tight tracking-tight sm:text-[42px]">Excel-এ হাতে তোলা নয় — চার ধাপে প্রমাণসহ report</h2>
            </div>
            <Link href="/upload" className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold transition hover:border-[var(--leaf)]">এখনই চেষ্টা করুন →</Link>
          </div>
        </Reveal>
        <div className="relative mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-10 right-10 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-[var(--leaf)]/30 to-transparent lg:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 90}>
              <TiltCard className="card card-hover relative h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--ink)] text-[var(--lime)]"><Ico d={s.i} /></span>
                  <span className="text-[13px] font-bold text-[var(--leaf)]">ধাপ {["১", "২", "৩", "৪"][i]}</span>
                </div>
                <h3 className="mt-6 text-[18px] font-bold">{s.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">{s.d}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Feature */}
      <section className="grain relative overflow-hidden bg-[var(--forest)] py-28 text-white">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute left-1/2 top-0 h-[300px] w-[700px] -translate-x-1/2 rounded-full bg-[var(--lime)]/10 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-4">
          <Reveal>
            <p className="text-sm font-semibold text-[var(--lime)]">কেন CarbonIQ</p>
            <h2 className="mt-2 max-w-2xl text-[34px] font-bold leading-tight tracking-tight sm:text-[42px]">প্রতিটা সংখ্যার পেছনে প্রমাণ</h2>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/60">সংখ্যা কোথা থেকে এলো, কে নিশ্চিত করল, পরে বদলানো হয়েছে কিনা — একজন auditor-এর প্রতিটা প্রশ্নের উত্তর system-এই থাকে।</p>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={(i % 3) * 70}>
                <TiltCard className="h-full rounded-[18px] border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-[var(--lime)]/40 hover:bg-white/[0.06]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--lime)]/12 text-[var(--lime)] ring-1 ring-inset ring-[var(--lime)]/20"><Ico d={f.i} /></span>
                  <h3 className="mt-5 text-[17px] font-bold">{f.t}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/60">{f.d}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MCP */}
      <section className="mx-auto max-w-6xl px-4 py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold text-[var(--leaf)]">Developers ও buyer-এর জন্য</p>
            <h2 className="mt-2 text-[34px] font-bold leading-tight tracking-tight sm:text-[40px]">Buyer-এর AI agent সরাসরি প্রমাণ পড়তে পারে</h2>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--muted)]">নিজস্ব Model Context Protocol server — ৫টা read-only tool। Buyer-এর সফটওয়্যার বা AI factory-র অনুমতিতে নির্গমন, তার হিসাব আর বিলের hash সরাসরি যাচাই করতে পারে।</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["get_emissions", "explain_calculation", "verify_ledger", "get_insights", "get_factors"].map((t) => (
                <span key={t} className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 font-mono text-[13px] text-[var(--forest)]">{t}</span>
              ))}
            </div>
            <Link href="/developers" className="mt-8 inline-block text-[15px] font-semibold text-[var(--leaf)] hover:underline">Live চালিয়ে দেখুন →</Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="overflow-hidden rounded-2xl bg-[var(--ink)] shadow-[0_30px_60px_-30px_rgba(11,31,23,.6)]">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 text-[11px] text-white/40">POST /api/mcp</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-white/75">{`→ tools/call  explain_calculation
  { "month": "2026-11", "activity": "electricity" }

← formula   126500 kWh × 0.696 kgCO2e/kWh
  result    `}<span className="text-[var(--lime)]">88.04 tCO2e</span>{`  (scope 2)
  source    Ember — Bangladesh 2024 (CC-BY-4.0)
  bill      sha256 1fd8a14e0c40…
  meter     4,938,800 − 4,812,300 = 126,500 `}<span className="text-emerald-300">✓</span>{`
  ledger    `}<span className="text-emerald-300">valid</span></pre>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-28">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-[28px] bg-[var(--ink)] px-8 py-16 text-center text-white">
            <div className="grid-bg absolute inset-0" />
            <div className="absolute left-1/2 top-0 h-[260px] w-[600px] -translate-x-1/2 rounded-full bg-[var(--leaf)]/30 blur-[100px]" />
            <div className="relative">
              <h2 className="text-[32px] font-bold tracking-tight sm:text-[44px]">Buyer-এর email আসার আগেই প্রস্তুত থাকুন</h2>
              <p className="mx-auto mt-4 max-w-xl text-[16px] text-white/60">১২ মাসের demo factory দিয়ে পুরো flow দেখুন — upload থেকে hash-সিল করা report পর্যন্ত।</p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/dashboard" className="btn-lime rounded-full px-7 py-3.5 text-[15px] font-bold transition">Demo দেখুন</Link>
                <Link href="/report" className="btn-ghost-dark rounded-full px-7 py-3.5 text-[15px] font-medium transition">Report নমুনা</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5"><LogoMark /><span className="text-[17px] font-extrabold tracking-tight">CarbonIQ<span className="ml-1 font-semibold text-[var(--leaf)]">BD</span></span></div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--muted)]">বাংলাদেশের garment শিল্পের জন্য প্রমাণসহ কার্বন হিসাব। Team AISLOP · International AI Builders Congress 2026।</p>
          </div>
          {[
            { h: "Product", l: [["/upload", "বিল upload"], ["/dashboard", "Dashboard"], ["/report", "Report"], ["/copilot", "Copilot"]] },
            { h: "যাচাই", l: [["/evaluation", "Evaluation"], ["/developers", "API · MCP"]] },
            { h: "ডেটার উৎস", l: [["/developers", "UK DESNZ 2026"], ["/developers", "Ember"], ["/developers", "GHG Protocol"]] },
          ].map((c) => (
            <div key={c.h}>
              <p className="text-sm font-bold">{c.h}</p>
              <ul className="mt-4 space-y-2.5 text-sm text-[var(--muted)]">
                {c.l.map(([href, label]) => <li key={label}><Link href={href} className="hover:text-[var(--ink)]">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--line)]">
          <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-[var(--muted)]">
            Emission factors: UK Government GHG Conversion Factors 2026 (OGL v3.0). Grid carbon intensity: Ember (CC-BY-4.0). Demo factory-র সব ডেটা synthetic।
          </p>
        </div>
      </footer>
    </main>
  );
}
