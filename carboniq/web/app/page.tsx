import Link from "next/link";
import { CountUp, Reveal, Spotlight, TiltCard } from "@/components/fx";

const STEPS = [
  { n: "০১", t: "বিলের ছবি তুলুন", d: "Phone-এর camera দিয়ে বিদ্যুৎ, গ্যাস বা ডিজেলের বিল। ছবি আপনার device-এই পড়া হয়।" },
  { n: "০২", t: "AI পড়ে, আপনি নিশ্চিত করেন", d: "বাংলা ও English OCR সংখ্যা বের করে। ছবির পাশে মিলিয়ে এক click-এ নিশ্চিত।" },
  { n: "০৩", t: "হিসাব ও hash-সিল", d: "সরকারি গুণকে scope ১ ও ২ হিসাব, প্রতিটা record SHA-256 chain-এ সিল — পরে বদলানো যায় না।" },
  { n: "০৪", t: "Buyer-ready report", d: "উৎস, গুণক, version আর ledger hash-সহ PDF, buyer বা auditor-কে পাঠানোর জন্য প্রস্তুত।" },
];

const FEATURES = [
  { i: "◎", t: "On-device OCR", d: "Tesseract বাংলা + English, browser-এই চলে। বিল server-এ যাওয়ার আগেই পড়া শেষ।" },
  { i: "⛓", t: "Evidence Ledger", d: "প্রতিটা সংখ্যার পেছনে বিল, গুণক, উৎস আর hash। Auditor এক click-এ যাচাই করতে পারেন।" },
  { i: "∑", t: "নিরীক্ষাযোগ্য হিসাব", d: "হিসাবে AI নেই — কার্যক্রম × গুণক। একই input-এ সবসময় একই ফল।" },
  { i: "⚑", t: "ডুপ্লিকেট আটকায়", d: "একই মাসের বিল দুবার দিলে ধরে ফেলে, যাতে কিছু দুবার গোনা না হয়।" },
  { i: "⌁", t: "সরকারি গুণক", d: "UK DESNZ 2026 (OGL) আর বাংলাদেশের grid intensity, version সহ।" },
  { i: "◈", t: "Human gate", d: "AI যা পড়ে, মানুষ নিশ্চিত না করা পর্যন্ত কোনো হিসাবে যায় না।" },
];

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <Spotlight className="relative overflow-hidden bg-[var(--ink)] text-white">
        <div className="grid-bg absolute inset-0" />
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[var(--leaf)]/30 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-32 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--lime)]" /> বাংলাদেশের garment শিল্পের জন্য
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 text-4xl font-bold leading-[1.15] tracking-tight sm:text-6xl">
                বিলের ছবি থেকে <span className="bg-gradient-to-r from-[var(--lime)] to-emerald-300 bg-clip-text text-transparent">buyer-ready</span> কার্বন report
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
                Upload করুন, AI পড়ে নেবে, আপনি নিশ্চিত করবেন — আর প্রতিটা সংখ্যার প্রমাণসহ scope ১ ও ২ নির্গমনের হিসাব, hash-সিল করা।
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/upload" className="group rounded-full bg-[var(--lime)] px-6 py-3 font-semibold text-[var(--ink)] shadow-[0_0_40px_-8px_var(--lime)] transition hover:scale-105">
                  বিল upload করুন <span className="inline-block transition group-hover:translate-x-1">→</span>
                </Link>
                <Link href="/dashboard" className="rounded-full border border-white/20 px-6 py-3 font-medium text-white transition hover:border-white/50 hover:bg-white/5">
                  Demo dashboard দেখুন
                </Link>
              </div>
            </Reveal>
          </div>

          {/* বিল স্ক্যান হওয়ার ছবি */}
          <Reveal delay={200} className="relative">
            <div className="floaty relative mx-auto w-full max-w-sm">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
                <div className="scanline" />
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>বিদ্যুৎ বিল · জুলাই ২০২৬</span><span>DPDC</span>
                </div>
                <div className="mt-4 space-y-2">
                  {[70, 90, 55, 80].map((w, i) => <div key={i} className="h-2 rounded bg-white/10" style={{ width: `${w}%` }} />)}
                </div>
                <div className="mt-5 rounded-xl border border-[var(--lime)]/40 bg-[var(--lime)]/10 p-3">
                  <p className="text-xs text-white/60">ব্যবহৃত ইউনিট</p>
                  <p className="text-2xl font-bold text-[var(--lime)]">১,৩৮,০০০ kWh</p>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 rounded-xl border border-white/10 bg-[var(--forest)] px-4 py-3 shadow-xl">
                <p className="text-xs text-white/60">Scope 2</p>
                <p className="font-bold">৯৬.০৫ টন CO₂e</p>
              </div>
              <div className="absolute -right-4 -top-5 rounded-full border border-white/10 bg-white px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow-xl">
                ✓ Hash-সিলকৃত
              </div>
            </div>
          </Reveal>
        </div>

        {/* সংখ্যা */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
            {[
              { v: 14000, s: "+", l: "উৎপাদন কেন্দ্র Higg FEM ব্যবহার করে" },
              { v: 100, s: "%", l: "record মানুষের নিশ্চিত করা" },
              { v: 256, s: "-bit", l: "SHA hash chain-এ সিল" },
              { v: 0, s: " ৳", l: "AI API খরচ — সব device-এ চলে" },
            ].map((x) => (
              <div key={x.l}>
                <p className="text-3xl font-bold text-[var(--lime)]"><CountUp to={x.v} suffix={x.s} /></p>
                <p className="mt-1 text-sm text-white/60">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </Spotlight>

      {/* উৎসের সারি */}
      <div className="overflow-hidden border-b border-black/5 bg-white py-4">
        <div className="marquee flex w-max gap-12 whitespace-nowrap text-sm text-gray-500">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["UK DESNZ 2026 · OGL v3.0", "Ember · CC-BY-4.0", "GHG Protocol", "Global Solar Atlas · CC BY 4.0", "Tesseract OCR", "SHA-256 Ledger", "Supabase", "বাংলা ও English"]
              .map((t) => <span key={`${k}-${t}`} className="flex items-center gap-12">{t}<span className="text-[var(--leaf)]">✦</span></span>))}
        </div>
      </div>

      {/* কীভাবে কাজ করে */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--leaf)]">কীভাবে কাজ করে</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Excel-এ হাতে তোলা নয় — চার ধাপে প্রমাণসহ report</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <TiltCard className="h-full rounded-2xl border border-black/5 bg-white p-6 shadow-sm hover:shadow-xl">
                <p className="text-sm font-bold text-[var(--leaf)]">{s.n}</p>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.d}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Feature */}
      <section className="bg-[var(--forest)] py-24 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lime)]">কেন CarbonIQ</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">প্রতিটা সংখ্যার পেছনে প্রমাণ</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={i * 70}>
                <TiltCard className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-[var(--lime)]/40">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--lime)]/15 text-lg text-[var(--lime)]">{f.i}</span>
                  <h3 className="mt-4 font-semibold">{f.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{f.d}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-[var(--ink)] px-8 py-14 text-center text-white">
            <div className="grid-bg absolute inset-0" />
            <div className="relative">
              <h2 className="text-3xl font-bold sm:text-4xl">Buyer-এর email আসার আগেই প্রস্তুত থাকুন</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/65">১২ মাসের demo factory-র ডেটা দিয়ে পুরো flow দেখুন — upload থেকে hash-সিল করা report পর্যন্ত।</p>
              <div className="mt-8 flex justify-center gap-3">
                <Link href="/dashboard" className="rounded-full bg-[var(--lime)] px-6 py-3 font-semibold text-[var(--ink)] transition hover:scale-105">Demo দেখুন</Link>
                <Link href="/report" className="rounded-full border border-white/20 px-6 py-3 transition hover:bg-white/5">Report নমুনা</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-black/5 py-8 text-center text-xs text-gray-500">
        CarbonIQ BD · Team AISLOP · Emission factors: UK Government GHG Conversion Factors 2026 (OGL v3.0) · Grid: Ember (CC-BY-4.0) · Demo data synthetic
      </footer>
    </main>
  );
}
