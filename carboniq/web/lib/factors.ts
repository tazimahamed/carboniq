// গুণকের উৎস। প্রতিটা হিসাবের সাথে এগুলো ledger-এ সিল হয়।
export type Factor = {
  activity: string; unit: string; kgPerUnit: number; scope: 1 | 2 | 3;
  source: string; license: string; year: number; version: string;
};

export const FACTORS: Factor[] = [
  // Grid: Ember Yearly Electricity Data (2025 release, ক্যালেন্ডার বছর ২০২৪) — বাংলাদেশ ৬৯৬ gCO2e/kWh।
  // এটা lifecycle intensity (জ্বালানি সরবরাহ-শৃঙ্খলসহ), T&D loss ছাড়া — report-এ এই সীমা উল্লেখ থাকে।
  { activity: "electricity", unit: "kWh", kgPerUnit: 0.696, scope: 2, source: "Ember Yearly Electricity Data — Bangladesh 2024, lifecycle intensity (696 gCO2e/kWh)", license: "CC-BY-4.0", year: 2024, version: "ember-2025" },
  { activity: "natural_gas", unit: "m3", kgPerUnit: 2.02633, scope: 1, source: "UK DESNZ GHG Conversion Factors 2026 — Natural gas (cubic metres)", license: "OGL-3.0", year: 2026, version: "2026.1" },
  { activity: "diesel", unit: "litre", kgPerUnit: 2.58354, scope: 1, source: "UK DESNZ GHG Conversion Factors 2026 — Diesel (average biofuel blend)", license: "OGL-3.0", year: 2026, version: "2026.1" },
  { activity: "lpg", unit: "litre", kgPerUnit: 1.55713, scope: 1, source: "UK DESNZ GHG Conversion Factors 2026 — LPG (litres)", license: "OGL-3.0", year: 2026, version: "2026.1" },
];

export const ACTIVITY_LABEL: Record<string, string> = {
  electricity: "বিদ্যুৎ (kWh)", natural_gas: "প্রাকৃতিক গ্যাস (m³)", diesel: "ডিজেল (লিটার)", lpg: "LPG (লিটার)",
};

export function findFactor(activity: string, unit: string) {
  return FACTORS.find((f) => f.activity === activity && f.unit === unit);
}
