// ছোট, বাছাই করা জ্ঞানভান্ডার (RAG) — Copilot পদ্ধতির প্রশ্নে এখান থেকে অংশ খুঁজে উৎসসহ দেখায়।
// প্রতিটা অংশ মূল দলিলের সারসংক্ষেপ (হুবহু উদ্ধৃতি নয়), দলিল/অধ্যায়ের নামসহ। খোঁজা হয় BM25 দিয়ে, browser-এই — বাইরের API নেই।
export type Passage = { id: string; title: string; section: string; url: string; text: string; tags: string };

export const KB: Passage[] = [
  { id: "ghg-scopes", title: "GHG Protocol Corporate Standard (Revised Edition)", section: "Chapter 4: Setting Operational Boundaries", url: "https://ghgprotocol.org/corporate-standard",
    text: "Scope 1 হলো প্রতিষ্ঠানের নিজের মালিকানাধীন বা নিয়ন্ত্রিত উৎস থেকে সরাসরি নির্গমন — যেমন বয়লারে গ্যাস, জেনারেটরে ডিজেল পোড়ানো। Scope 2 হলো কেনা বিদ্যুৎ, steam, তাপ বা শীতলীকরণ উৎপাদনের পরোক্ষ নির্গমন। Scope 3 হলো বাকি সব পরোক্ষ নির্গমন, যেমন কেনা কাঁচামাল, পরিবহন, বর্জ্য; Scope 3 রিপোর্ট করা ঐচ্ছিক।", tags: "scope 1 2 3 স্কোপ সরাসরি পরোক্ষ direct indirect boundary সীমা" },
  { id: "ghg-calc", title: "GHG Protocol Corporate Standard (Revised Edition)", section: "Chapter 6: Identifying and Calculating GHG Emissions", url: "https://ghgprotocol.org/corporate-standard",
    text: "সবচেয়ে প্রচলিত পদ্ধতি হলো কার্যক্রমের তথ্য (activity data, যেমন kWh, m³, লিটার) কে প্রকাশিত নির্গমন গুণক (emission factor) দিয়ে গুণ করা। সরাসরি পরিমাপ পাওয়া গেলে সেটা ব্যবহার করা যায়। হিসাবের পদ্ধতি, গুণকের উৎস আর অনুমানগুলো লিখে রাখতে হয়, যাতে অন্য কেউ একই ফল পেতে পারে।", tags: "হিসাব calculation সূত্র formula গুণক factor activity data কীভাবে" },
  { id: "scope2-location", title: "GHG Protocol Scope 2 Guidance (2015)", section: "Chapter 4 & 6: Location-based and market-based methods", url: "https://ghgprotocol.org/scope-2-guidance",
    text: "Location-based পদ্ধতিতে যে grid থেকে বিদ্যুৎ নেওয়া হয় তার গড় নির্গমন-তীব্রতা ব্যবহার হয়। Market-based পদ্ধতিতে প্রতিষ্ঠানের কেনা চুক্তি বা সনদ (যেমন renewable energy certificate) ধরা হয়, যদি সেগুলো মান-মানদণ্ড পূরণ করে। Guidance অনুযায়ী দুটো পদ্ধতিতেই রিপোর্ট করার কথা বলা হয়েছে (dual reporting)। CarbonIQ এখন location-based ব্যবহার করে।", tags: "scope 2 location market based grid বিদ্যুৎ renewable সনদ certificate rec" },
  { id: "ember-grid", title: "Ember — Yearly Electricity Data", section: "Bangladesh, 2024 (CC-BY-4.0)", url: "https://ember-energy.org/data/yearly-electricity-data/",
    text: "Ember দেশভিত্তিক বিদ্যুৎ উৎপাদন আর নির্গমনের খোলা তথ্য প্রকাশ করে। CarbonIQ বাংলাদেশের জন্য Ember-এর ২০২৪ সালের lifecycle নির্গমন-তীব্রতা ৬৯৬ g CO₂e/kWh ব্যবহার করে — এতে জ্বালানি সরবরাহ-শৃঙ্খলের নির্গমনও আছে, সঞ্চালন-ক্ষতি (T&D loss) নেই। বাংলাদেশের বিদ্যুৎ মূলত গ্যাস, তেল আর কয়লা থেকে, তাই গুণক বেশি।", tags: "ember grid গুণক 0.696 696 বিদ্যুৎ বাংলাদেশ factor lifecycle কেন" },
  { id: "desnz", title: "UK DESNZ Greenhouse Gas Reporting: Conversion Factors 2026", section: "Fuels", url: "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
    text: "যুক্তরাজ্য সরকারের প্রকাশিত জ্বালানির গুণক (প্রাকৃতিক গ্যাস প্রতি m³, ডিজেল ও LPG প্রতি লিটার)। এগুলো যুক্তরাজ্যের রিপোর্টিংয়ের জন্য প্রকাশিত; জ্বালানি পোড়ানোর রসায়ন একই বলে অন্য দেশে proxy হিসেবে ব্যবহার করা যায়, তবে বায়োফুয়েল মিশ্রণ বা গ্যাসের গঠন আলাদা হলে সামান্য পার্থক্য হতে পারে — তাই CarbonIQ এগুলোকে proxy চিহ্ন দিয়ে দেখায়।", tags: "desnz গ্যাস ডিজেল lpg গুণক factor proxy যুক্তরাজ্য uk" },
  { id: "ipmvp-c", title: "IPMVP Core Concepts (EVO, 2022)", section: "Option C: Whole Facility", url: "https://evo-world.org/en/products-services-mainmenu-en/protocols/ipmvp",
    text: "IPMVP Option C-তে পুরো কারখানার মূল মিটার বা বিলের তথ্য দিয়ে সাশ্রয় মাপা হয়। প্রকল্পের আগের সময় (baseline) দিয়ে একটা model বানানো হয় যা উৎপাদন, আবহাওয়ার মতো চলকের সাথে ব্যবহারের সম্পর্ক ধরে। প্রকল্পের পরে একই model দিয়ে 'প্রকল্প না করলে কত হতো' (adjusted baseline) অনুমান করে আসল ব্যবহার বাদ দিলে সাশ্রয়। সাশ্রয় পুরো কারখানার পরিবর্তনের তুলনায় যথেষ্ট বড় না হলে Option C উপযুক্ত নয়।", tags: "mrv ipmvp option c baseline সাশ্রয় savings যাচাই কমানো adjusted measurement verification" },
  { id: "ashrae14", title: "ASHRAE Guideline 14 — Measurement of Energy, Demand, and Water Savings", section: "Baseline model criteria", url: "https://www.ashrae.org/technical-resources/standards-and-guidelines",
    text: "Regression baseline model কতটা ভালো তা মাপতে CV(RMSE) আর NMBE ব্যবহার হয়। মাসিক তথ্যে প্রচলিত মানদণ্ড হলো CV(RMSE) ২০%-এর মধ্যে আর NMBE ±৫%-এর মধ্যে। Model এই মানদণ্ড পূরণ না করলে তার উপর ভিত্তি করে সাশ্রয় দাবি করা দুর্বল। সাশ্রয়ের অনিশ্চয়তাও জানাতে হয়।", tags: "ashrae cv rmse nmbe model মান fit অনিশ্চয়তা uncertainty baseline" },
  { id: "leakage", title: "GHG Protocol for Project Accounting", section: "Secondary effects (leakage)", url: "https://ghgprotocol.org/standards/project-protocol",
    text: "একটা প্রকল্পের কারণে অন্য কোথাও নির্গমন বাড়লে তাকে secondary effect বা leakage বলে — যেমন grid-এর বিদ্যুৎ কমল কিন্তু জেনারেটরের ডিজেল বাড়ল। প্রকল্পের নির্গমন-হ্রাস হিসাবের সময় এগুলো বাদ দিয়ে নিট ফল দেখাতে হয়। CarbonIQ সব যাচাইযোগ্য জ্বালানি একসাথে দেখে নিট কমানো হিসাব করে।", tags: "leakage rebound secondary নিট net ডিজেল জেনারেটর অন্য জায়গায় বাড়" },
  { id: "intensity", title: "CarbonIQ পদ্ধতি নোট", section: "মোট বনাম প্রতি পিস", url: "/evaluation",
    text: "মোট নির্গমন কমা মানেই দক্ষতা বাড়া নয় — উৎপাদন কমলেও মোট কমে। তাই CarbonIQ তিনটা মাপ আলাদা দেখায়: মোট নির্গমন, প্রতি পিসে নির্গমন (intensity) আর উৎপাদন ও আবহাওয়া মিলিয়ে সমন্বিত সাশ্রয়। দাবির ভিত্তি সমন্বিত সাশ্রয়।", tags: "intensity প্রতি পিস উৎপাদন কম দক্ষতা efficiency মোট" },
  { id: "verification-levels", title: "CarbonIQ পদ্ধতি নোট", section: "যাচাইয়ের তিন স্তর", url: "/mrv",
    text: "তিনটা স্তর আলাদা: (১) System-এর হিসাব — ইনপুট আর গুণক দিয়ে CarbonIQ হিসাব করেছে; (২) কারখানার যাচাই — দায়িত্বপ্রাপ্ত ব্যক্তি মূল বিল মিলিয়ে দেখেছেন; (৩) স্বাধীন যাচাই — স্বাধীন যাচাইকারী নির্দিষ্ট পরিধিতে রিপোর্ট দিয়েছেন। একটা আরেকটাকে বোঝায় না, আর Evidence Score বেশি হলেও স্বাধীন যাচাই ছাড়া 'স্বাধীনভাবে যাচাইকৃত' বলা যায় না।", tags: "যাচাই verification স্তর level স্বাধীন independent কারখানা review auditor" },
  { id: "hash", title: "CarbonIQ পদ্ধতি নোট", section: "Hash-ledger কী প্রমাণ করে", url: "/developers",
    text: "প্রতিটা record SHA-256 hash দিয়ে আগের record-এর সাথে শিকলের মতো বাঁধা। কেউ পরে কোনো সংখ্যা বদলালে hash মিলবে না, তাই বদল ধরা পড়ে। কিন্তু hash প্রমাণ করে না যে মূল বিলটা আসল — সেটার জন্য বিল, মিটার রিডিং আর মানুষের যাচাই লাগে।", tags: "hash ledger sha 256 বদলানো tamper প্রমাণ chain শিকল" },
  { id: "passport", title: "CarbonIQ পদ্ধতি নোট", section: "Carbon Passport-এর সীমা ও ভাগের পদ্ধতি", url: "/passports",
    text: "Passport-এ কারখানার Scope ১ আর Scope ২ নির্গমন buyer-দের মধ্যে উৎপাদিত পিসের অনুপাতে সমান ভাগ করা হয়। এটা পূর্ণ product carbon footprint নয় — কাঁচামাল, পরিবহন আর অন্যান্য Scope ৩ নেই। পণ্যের ধরনে বড় পার্থক্য থাকলে machine-hour বা ওজন দিয়ে ভাগ করা বেশি সঠিক।", tags: "passport পাসপোর্ট order buyer ভাগ allocation সীমা boundary footprint qr" },
  { id: "monte-carlo", title: "IPCC 2006 Guidelines, Vol. 1", section: "Chapter 3: Uncertainties (Approach 2 — Monte Carlo)", url: "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol1.html",
    text: "অনিশ্চয়তা হিসাবের একটা পদ্ধতি হলো Monte Carlo: প্রতিটা ইনপুটের (পরিমাণ, গুণক) সম্ভাব্য বণ্টন থেকে হাজারবার নমুনা নিয়ে মোট নির্গমনের সম্ভাব্য সীমা বের করা। IPCC সাধারণত ৯৫% আস্থা-সীমা জানাতে বলে। CarbonIQ মিটারের নির্ভুলতা আর IPCC-র গুণক-পরিসর দিয়ে ২,০০০ বার simulation করে।", tags: "monte carlo অনিশ্চয়তা uncertainty সীমা range ipcc simulation" },
  { id: "dpp", title: "European Commission — Ecodesign for Sustainable Products Regulation", section: "Digital Product Passport", url: "https://commission.europa.eu/energy-climate-change-environment/standards-tools-and-labels/products-labelling-rules-and-requirements/ecodesign-sustainable-products-regulation_en",
    text: "ইউরোপীয় ইউনিয়নে Digital Product Passport ধাপে ধাপে বিভিন্ন পণ্যে চালু হচ্ছে; textile-এর জন্য নির্দিষ্ট নিয়ম পরে আসবে বলে পরিকল্পনা আছে, সময়সূচি বদলাতে পারে। CarbonIQ-এর passport কোনো EU নিয়ম মেনে চলার দাবি করে না — এটা যাচাইযোগ্য কার্বন তথ্য দেওয়ার প্রস্তুতি।", tags: "dpp digital product passport eu ইউরোপ নিয়ম regulation csrd buyer" },
];

// ---------- BM25 ----------
const STOP = new Set(["কী", "কি", "কেন", "কীভাবে", "কিভাবে", "এর", "আর", "ও", "এবং", "হয়", "হলো", "করে", "করা", "কত", "এটা", "সেটা", "যে", "তা", "the", "a", "is", "of", "what", "how", "why", "and", "to", "in", "মানে", "বলো", "বলুন", "বাংলাদেশ", "দেশ", "আজ", "কে", "who", "বাংলা"]);
const SUFFIX = /(গুলো|গুলি|দের|টা|টি|এর|য়ের|ের|কে|তে|রা|র)$/;
export function tokenize(s: string): string[] {
  return (s.toLowerCase().normalize("NFC").match(/[\p{L}\p{M}\p{N}]+/gu) ?? [])
    .map((w) => (w.length > 3 ? w.replace(SUFFIX, "") : w)).filter((w) => w && !STOP.has(w));
}
const docs = KB.map((p) => tokenize(`${p.title} ${p.section} ${p.text} ${p.tags} ${p.tags}`));
const avgdl = docs.reduce((s, d) => s + d.length, 0) / docs.length;
const df = new Map<string, number>();
for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) ?? 0) + 1);

export function search(q: string, k = 2) {
  const qt = Array.from(new Set(tokenize(q))), N = docs.length, k1 = 1.4, b = 0.75;
  const scored = docs.map((d, i) => {
    let s = 0;
    for (const w of qt) {
      const tf = d.filter((x) => x === w).length; if (!tf) continue;
      const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
      s += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.length) / avgdl)));
    }
    return { p: KB[i], score: s };
  }).sort((a, b2) => b2.score - a.score);
  return scored.slice(0, k);
}

/** উত্তর দেওয়ার মতো যথেষ্ট মিল আছে কিনা — না থাকলে "উৎসে পাওয়া যায়নি" */
export const KB_MIN_SCORE = 2.2;
