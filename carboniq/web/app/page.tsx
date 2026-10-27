import Link from "next/link";
import { Logo } from "@/components/Frame";

const HASH = "a65eff8d35 48a4415f52 5ea4071f2d".split(" ");

const STEPS = [
  { t: "বিলের ছবি বা PDF দিন", d: "বিদ্যুৎ, গ্যাস বা ডিজেলের বিল — phone-এর ছবি, iPhone-এর HEIC বা email-এর PDF। ছবিটা আপনার device-এই পড়া হয়।" },
  { t: "সংখ্যা মিলিয়ে নিশ্চিত করুন", d: "বাংলা ও English OCR ইউনিট আর মাস বের করে, মিটার রিডিং থেকে আলাদা করে হিসাব করে মিলিয়ে দেখে। আপনি নিশ্চিত না করা পর্যন্ত কিছু হিসাবে যায় না।" },
  { t: "হিসাব ও সিল", d: "সরকারি গুণকে scope ১ ও ২ নির্গমন হিসাব হয়, আর মূল বিলসহ প্রতিটা record একটা hash chain-এ সিল হয় — পরে কেউ বদলালে ধরা পড়ে।" },
  { t: "Buyer-কে report দিন", d: "উৎস, গুণক আর ledger hash-সহ PDF report। Buyer-এর নিজের সফটওয়্যার বা AI agent চাইলে API ও MCP দিয়ে সরাসরি পড়তে পারে।" },
];

const CONTROLS = [
  { t: "হিসাবে কোনো AI নেই", d: "নির্গমন = পরিমাণ × গুণক। একই বিলে সবসময় একই ফল, যে কেউ calculator-এ মিলিয়ে নিতে পারেন।" },
  { t: "মিটার রিডিং দিয়ে যাচাই", d: "বিলে ছাপা ইউনিট আর (বর্তমান − পূর্ববর্তী রিডিং) আলাদাভাবে পড়ে মেলানো হয়। না মিললে সতর্ক করে।" },
  { t: "মূল বিল সংরক্ষিত", d: "ছবির SHA-256 fingerprint ledger-এ থাকে। Auditor যেকোনো সংখ্যার পাশে মূল বিল খুলে দেখতে পারেন।" },
  { t: "বদলানো যায় না", d: "প্রতিটা record আগেরটার hash-এর সাথে জোড়া। একটা সংখ্যা বদলালে পুরো chain যাচাইয়ে ব্যর্থ হয়।" },
  { t: "উৎস ও license স্পষ্ট", d: "UK DESNZ 2026 (OGL v3.0), Ember (CC-BY-4.0) — প্রতিটা গুণকের বছর আর version report-এ লেখা থাকে।" },
  { t: "ডেটা আপনার", d: "Buyer শুধু factory-র অনুমতিতে দেখে। AI উত্তর আপনার browser-এ চলে, কোনো বাইরের AI কোম্পানিতে ডেটা যায় না।" },
];

function EvidenceChain() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-label="একটা বিল থেকে ledger পর্যন্ত উদাহরণ">
      {/* বিল */}
      <div className="chain-step rounded-lg border border-[var(--line)] bg-white p-5 shadow-[0_1px_2px_rgba(24,32,51,.06),0_8px_24px_-12px_rgba(28,39,86,.25)]" style={{ animationDelay: "100ms" }}>
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">বিদ্যুৎ বিল</p>
          <p className="text-xs text-[var(--muted)]">নভেম্বর ২০২৬</p>
        </div>
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-[13px]">
          <dt className="text-[var(--muted)]">বর্তমান রিডিং</dt><dd className="font-mono">4,938,800</dd>
          <dt className="text-[var(--muted)]">পূর্ববর্তী রিডিং</dt><dd className="font-mono">4,812,300</dd>
          <dt className="font-medium">ব্যবহৃত ইউনিট</dt>
          <dd className="rounded bg-[#fdf3dc] px-1.5 font-mono font-medium">126,500 kWh</dd>
        </dl>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--leaf)]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8.5l3 3 7-7" /></svg>
          মিটার রিডিংয়ের সাথে মিলেছে
        </p>
      </div>

      <div className="chain-link ml-10 h-6 w-px bg-[var(--line)]" style={{ animationDelay: "450ms" }} />

      {/* হিসাব */}
      <div className="chain-step rounded-lg bg-[var(--ink)] p-5 text-white" style={{ animationDelay: "550ms" }}>
        <p className="font-mono text-[13px] text-white/70">126,500 kWh × 0.696 kg/kWh</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">88.04 <span className="text-base font-normal text-white/60">টন CO₂e</span></p>
        <p className="mt-2 text-xs text-white/50">Scope 2 · গুণক: Ember, বাংলাদেশ ২০২৪</p>
      </div>

      <div className="chain-link ml-10 h-6 w-px bg-[var(--line)]" style={{ animationDelay: "850ms" }} />

      {/* ledger */}
      <div className="chain-step rounded-lg border border-[var(--line)] bg-white p-4" style={{ animationDelay: "950ms" }}>
        <p className="text-xs text-[var(--muted)]">Ledger — প্রতিটা record আগেরটার সাথে জোড়া</p>
        <ol className="mt-3 flex items-center gap-1.5">
          {HASH.map((h, i) => (
            <li key={h} className="flex items-center gap-1.5">
              <span className={`rounded border px-2 py-1 font-mono text-[11px] ${i === HASH.length - 1 ? "border-[var(--lime)] bg-[#fdf3dc] text-[var(--text)]" : "border-[var(--line)] text-[var(--muted)]"}`}>{h}</span>
              {i < HASH.length - 1 && <span className="h-px w-3 bg-[var(--muted)]/40" />}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="border-b border-[var(--line)] bg-[linear-gradient(180deg,#fff,var(--paper))]">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[13px] text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--leaf)]" /> বাংলাদেশের garment factory-র জন্য
            </p>
            <h1 className="mt-6 max-w-[16ch] text-[40px] font-semibold leading-[1.15] tracking-tight text-[var(--text)] sm:text-[52px]">
              প্রতিটা বিল থেকে প্রমাণসহ কার্বন হিসাব
            </h1>
            <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-[var(--muted)]">
              বিদ্যুৎ, গ্যাস আর ডিজেলের বিল পড়ে scope ১ ও ২ নির্গমন হিসাব করে। প্রতিটা সংখ্যার পেছনে থাকে মূল বিল, গুণকের উৎস আর একটা
              বদলানো-যায়-না এমন ledger — buyer বা auditor যা চাইবেন, তা দেখানোর জন্য প্রস্তুত।
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/upload" className="rounded-md bg-[var(--forest)] px-5 py-3 text-[15px] font-medium text-white shadow-sm hover:bg-[var(--ink)]">বিল upload করুন</Link>
              <Link href="/dashboard" className="rounded-md border border-[var(--line)] bg-white px-5 py-3 text-[15px] font-medium hover:border-[var(--muted)]/50">Demo ড্যাশবোর্ড দেখুন</Link>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-[var(--line)] pt-6">
              <div><dt className="text-xs text-[var(--muted)]">পদ্ধতি</dt><dd className="mt-1 text-sm font-medium">GHG Protocol</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">গুণক</dt><dd className="mt-1 text-sm font-medium">DESNZ 2026, Ember</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">AI API খরচ</dt><dd className="mt-1 text-sm font-medium">নেই</dd></div>
            </dl>
          </div>
          <EvidenceChain />
        </div>
      </section>

      {/* কেন */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="text-[30px] font-semibold leading-tight tracking-tight">Buyer এখন প্রমাণ চায়, শুধু সংখ্যা না</h2>
          <div className="space-y-4 text-[16px] leading-relaxed text-[var(--muted)]">
            <p>Higg FEM-এর মতো কাঠামো ৮০টার বেশি দেশের ১৪,০০০-এর বেশি উৎপাদন কেন্দ্র ব্যবহার করে, আর এর energy অংশে বিদ্যুতের বিল প্রমাণ হিসেবে লাগে। বেশিরভাগ factory এখনো বিল হাতে Excel-এ তোলে — ভুল হয়, মাস বাদ পড়ে, একই বিল দুবার গোনা হয়, আর কোনো audit trail থাকে না।</p>
            <p className="text-[var(--text)]">CarbonIQ সেই কাজটা বিল থেকেই শুরু করে, বাংলায়, আর প্রতিটা ধাপের প্রমাণ রেখে।</p>
          </div>
        </div>
      </section>

      {/* কীভাবে — এটা আসলেই একটা ক্রম, তাই সংখ্যা */}
      <section id="how" className="border-y border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-[30px] font-semibold tracking-tight">বিল থেকে report, চার ধাপে</h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="bg-white p-6">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--ink)] text-[13px] font-semibold text-white">{i + 1}</span>
                <h3 className="mt-5 text-[17px] font-semibold">{s.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* প্রমাণ ও নিরাপত্তা */}
      <section id="trust" className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <h2 className="text-[30px] font-semibold tracking-tight">একজন auditor যা যাচাই করবেন, তা আগে থেকেই তৈরি</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[var(--muted)]">সংখ্যা কোথা থেকে এলো, কে নিশ্চিত করল, পরে বদলানো হয়েছে কিনা — প্রতিটা প্রশ্নের উত্তর system-এই থাকে।</p>
        </div>
        <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {CONTROLS.map((c) => (
            <div key={c.t} className="border-t-2 border-[var(--ink)] pt-4">
              <dt className="text-[16px] font-semibold">{c.t}</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">{c.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Developers */}
      <section className="border-t border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-[30px] font-semibold tracking-tight">Buyer-এর system সরাসরি পড়তে পারে</h2>
            <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-[var(--muted)]">
              REST API আর Model Context Protocol (MCP) server — buyer-এর নিজের সফটওয়্যার বা AI agent factory-র অনুমতিতে নির্গমন, তার হিসাব আর প্রমাণ সরাসরি পড়তে পারে। সব tool শুধু পড়ার জন্য।
            </p>
            <Link href="/developers" className="mt-6 inline-block text-[15px] font-medium text-[var(--forest)] underline decoration-[var(--forest)]/30 underline-offset-4 hover:decoration-[var(--forest)]">MCP চালিয়ে দেখুন</Link>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-[var(--ink)] p-5 font-mono text-[12.5px] leading-relaxed text-white/80">{`> tools/call explain_calculation
  { "month": "2026-11", "activity": "electricity" }

  formula   126500 kWh × 0.696 kgCO2e/kWh
  result    88.04 tCO2e  (scope 2)
  source    Ember — Bangladesh 2024 (CC-BY-4.0)
  bill      sha256 1fd8a14e0c40…
  meter     4,938,800 − 4,812,300 = 126,500  ✓
  ledger    valid`}</pre>
        </div>
      </section>

      {/* শেষ ডাক */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg bg-[var(--ink)] px-8 py-10 text-white md:flex-row md:items-center">
          <div>
            <h2 className="text-[26px] font-semibold tracking-tight">Buyer-এর email আসার আগেই প্রস্তুত থাকুন</h2>
            <p className="mt-2 text-white/65">১২ মাসের demo factory দিয়ে পুরো প্রক্রিয়া দেখুন, বা নিজের একটা বিল দিয়ে শুরু করুন।</p>
          </div>
          <div className="flex gap-3">
            <Link href="/upload" className="rounded-md bg-white px-5 py-3 text-[15px] font-medium text-[var(--ink)] hover:bg-white/90">বিল upload করুন</Link>
            <Link href="/report" className="rounded-md border border-white/25 px-5 py-3 text-[15px] font-medium hover:bg-white/5">নমুনা report</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 text-sm sm:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-[var(--muted)]">Team AISLOP, International AI Builders Congress 2026। Demo factory-র সব ডেটা synthetic।</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Product</p>
            <Link href="/dashboard" className="block text-[var(--muted)] hover:text-[var(--text)]">ড্যাশবোর্ড</Link>
            <Link href="/upload" className="block text-[var(--muted)] hover:text-[var(--text)]">বিল upload</Link>
            <Link href="/copilot" className="block text-[var(--muted)] hover:text-[var(--text)]">Copilot</Link>
          </div>
          <div className="space-y-2">
            <p className="font-medium">যাচাই</p>
            <Link href="/evaluation" className="block text-[var(--muted)] hover:text-[var(--text)]">মাপা ফলাফল</Link>
            <Link href="/developers" className="block text-[var(--muted)] hover:text-[var(--text)]">API ও MCP</Link>
            <Link href="/report" className="block text-[var(--muted)] hover:text-[var(--text)]">নমুনা report</Link>
          </div>
        </div>
        <p className="border-t border-[var(--line)] px-5 py-5 text-center text-xs text-[var(--muted)]">
          Emission factors: UK Government GHG Conversion Factors 2026 (OGL v3.0). Grid carbon intensity: Ember (CC-BY-4.0).
        </p>
      </footer>
    </main>
  );
}
