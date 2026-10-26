// গুণকের উৎস। প্রতিটা হিসাবের সাথে এগুলো ledger-এ সিল হয়।
export type Factor = {
  activity: string; unit: string; kgPerUnit: number; scope: 1 | 2 | 3;
  source: string; license: string; year: number; version: string;
};

export const FACTORS: Factor[] = [
  // Grid: শেষ ১২ মাস (জুন ২০২৫–মে ২০২৬), ৫৮৪ gCO2e/kWh — Ember-এর yearly CSV থেকে মিলিয়ে নিতে হবে
  { activity: "electricity", unit: "kWh", kgPerUnit: 0.584, scope: 2, source: "Bangladesh grid intensity (Ember / LowCarbonPower, Jun 2025–May 2026)", license: "CC-BY-4.0", year: 2026, version: "2026.1" },
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
