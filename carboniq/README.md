# CarbonIQ BD

বিলের ছবি থেকে buyer-ready কার্বন report — বাংলাদেশের garment শিল্পের জন্য।

## কাঠামো
```
web/        Next.js — website + API + OCR (Tesseract.js) — Vercel-এ চলে
supabase/   database schema.sql আর seed.sql
data/        (গুণক এখন web/lib/factors.ts-এ)
data/       গুণক (emission factor)
```

## নিজের computer-এ চালানো
```bash
cd web
npm install
copy .env.example .env.local   # তারপর Supabase-এর মান বসাও
npm run dev
```
খোলো: http://localhost:3000

## সতর্কতা
`web/lib/factors.ts`-এর গুণকগুলো **উদাহরণ মান**। Submission-এর আগে UK DESNZ 2026 আর Ember থেকে আসল মান বসাতে হবে।
