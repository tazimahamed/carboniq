#!/usr/bin/env bash
# Evaluation চালানো (Node 22+, tesseract থাকলে OCR অংশও চলে)
#   bash eval/run.sh
# lib/*.ts ফাইলগুলো একটা temp folder-এ কপি করে (Node-এর জন্য import-এ .ts যোগ করে) তারপর চালায়
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; WEB="$HERE/.."
TMP="$(mktemp -d)"; mkdir -p "$TMP/lib" "$TMP/eval"
for f in "$WEB"/lib/{engine,factors,ledger,parseBill,copilot,mcp,insights,assumptions,demoModel,planner,passport,passportRows,passportText,qr}.ts; do
  sed -E 's#from "\./([A-Za-z]+)"#from "./\1.ts"#' "$f" > "$TMP/lib/$(basename "$f")"
done
cp "$HERE/run.ts" "$TMP/eval/run.ts"; cp -r "$HERE/fixtures" "$TMP/eval/fixtures"
SAMPLES="${SAMPLES:-$WEB/../samples}" node "$TMP/eval/run.ts"
cp "$TMP/eval/results.json" "$HERE/results.json"
rm -rf "$TMP"
echo "ফল: eval/results.json"
