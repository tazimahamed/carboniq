# CarbonIQ BD

**বাংলাদেশের garment কারখানার জন্য যাচাইযোগ্য কার্বন হিসাব, নির্গমন কমানোর প্রমাণ (MRV) আর buyer-ready Carbon Passport।**

Live: https://carboniq-lake.vercel.app · Team AISLOP · International AI Builders Congress 2026 (ClimateSphere AI → CarbonIQ track)

> Demo কারখানার সব তথ্য synthetic। কোনো সরকারি সনদ বা স্বাধীন নিরীক্ষার দাবি নেই।

## কী করে (Measure → Verify → Detect → Optimize → Share)

| ধাপ | Feature | পদ্ধতি |
|---|---|---|
| Measure | বিদ্যুৎ, গ্যাস, LPG, ডিজেলের বিল — ছবি (OCR) বা online PDF (লেখা সরাসরি) | Tesseract.js (ben+eng, browser-এ), নথির ধরন নিজে চেনা, মিটার রিডিং দিয়ে মিলিয়ে দেখা |
| Measure | Scope 1 ও 2, প্রতি পিসে নির্গমন | GHG Protocol; Ember 2024 (বাংলাদেশ grid), DESNZ 2026 (জ্বালানি, proxy চিহ্নসহ) |
| Verify | SHA-256 hash-ledger, Evidence Score, পরে বিল যুক্ত করা | append-only; বিল আগের record-এর প্রমাণ হিসেবে যুক্ত হয়, দুবার গোনা হয় না |
| Verify | **MRV**: প্রকল্প না করলে কত হতো বনাম আসল | IPMVP Option C-র ধারণা, OLS baseline, ৯০% prediction interval, ASHRAE Guideline 14 মানদণ্ড, leakage/rebound যাচাই |
| Verify | যাচাইয়ের তিন স্তর | System → কারখানা → স্বাধীন যাচাইকারী; নিজস্ব hash-chain |
| Detect | অস্বাভাবিক ব্যবহার, audit ঝুঁকি, অনিশ্চয়তা | leave-one-out regression; ব্যাখ্যাযোগ্য ঝুঁকির নিয়ম; Monte Carlo (IPCC 2006 পরিসর, ৯৫%) |
| Optimize | Energy Twin (isometric, what-if) | বিল থেকে শেখা model, backtest MAPE |
| Optimize | Budget Planner + MACC, buyer-লক্ষ্যের ঝুঁকি | ২^১০ সমন্বয় পরীক্ষা, NPV (১০%); রৈখিক ধারা + prediction interval |
| Optimize | Geo: Rooftop Solar Scanner, Grid-এর উৎস | satellite-এ ছাদ আঁকা + NASA POWER সূর্যালোক; WRI Global Power Plant Database |
| Share | Carbon Passport + QR | হিসাবের সীমা, ভাগের পদ্ধতি, MRV, অনিশ্চয়তা, যাচাইয়ের স্তর — hash-সিল |
| Share | CSV export, MCP API (৭টা read-only tool) | rate limit, input যাচাই |
| AI | বাংলা Copilot (লিখে/বলে) | নিয়মভিত্তিক router + MCP tool + BM25 RAG (উৎসসহ) + ঐচ্ছিক on-device Qwen2.5; guardrail সংখ্যা বানাতে দেয় না |

বাইরের কোনো AI/cloud API নেই — OCR, LLM, RAG সব browser-এ।

## চালানো

```bash
cd web
npm install
cp .env.example .env.local   # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service role key শুধু server/Vercel env-এ)
npm run dev
```

Supabase SQL Editor-এ ক্রমানুসারে: `supabase/schema.sql` → `seed.sql` → `migration_2_production_passport.sql` → `migration_3_mrv_verification.sql`। তারপর Dashboard → **Demo reset**।

## পরীক্ষা

```bash
cd web && bash eval/run.sh     # ২০৮টা স্বয়ংক্রিয় পরীক্ষা: unit, integration, adversarial, scientific
```
ফল `/evaluation` পাতায়, সাথে যা মাপা হয়নি তার তালিকা।

## তথ্যের উৎস ও লাইসেন্স
- Ember Yearly Electricity Data (CC-BY-4.0) — বাংলাদেশ grid, ৬৯৬ g CO₂e/kWh (২০২৪, lifecycle)
- UK DESNZ GHG Conversion Factors 2026 (OGL-3.0) — গ্যাস, ডিজেল, LPG (বাংলাদেশে proxy)
- IPCC 2006 Guidelines — গুণকের অনিশ্চয়তা-পরিসর
- WRI Global Power Plant Database v1.3.0 (CC BY 4.0) — ২০২১-এর তালিকা, নতুন কেন্দ্র নেই
- NASA POWER — সূর্যালোক (চলার সময় browser থেকে)
- Satellite ছবি: Esri World Imagery; মানচিত্র: © OpenStreetMap, © CARTO

## সীমাবদ্ধতা
- Demo তথ্য synthetic; MRV-তে মাত্র ১২ মাস → "প্রাথমিক অনুমান"
- Zone-ভাগ, solar-এর অনুমান, প্রকল্পের খরচ-সাশ্রয় শিল্প-অনুমান — গণিত পরীক্ষিত, অনুমান আসল তথ্যে যাচাই বাকি
- একটা demo কারখানা; production-এ প্রতি কারখানার token আর tenant isolation লাগবে
- Scope 3, machine-level IoT তথ্য — roadmap
