# CarbonIQ BD

বিলের ছবি থেকে buyer-ready কার্বন report — বাংলাদেশের garment শিল্পের জন্য।

## Folder
```
api/        FastAPI backend (হিসাব, OCR, ledger)
supabase/   database schema (SQL)
web/        Next.js frontend (পরে আসবে)
data/       গুণক (emission factor) ও demo data
```

## Backend চালানো (নিজের computer-এ)
```bash
cd api
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Browser-এ খোলো: http://127.0.0.1:8000/docs

## Test
```bash
cd api
pytest
```

## সতর্কতা
`data/factors_seed.csv`-এর গুণকগুলো **উদাহরণ মান**। Submission-এর আগে UK DESNZ 2026 আর Ember থেকে আসল মান বসাতে হবে।
