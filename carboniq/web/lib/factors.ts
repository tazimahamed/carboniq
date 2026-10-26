// উদাহরণ মান — submission-এর আগে UK DESNZ 2026 আর Ember থেকে আসল মান বসাতে হবে
export type Factor = {
  activity: string; unit: string; kgPerUnit: number; scope: 1 | 2 | 3;
  source: string; license: string; year: number; version: string;
};

export const FACTORS: Factor[] = [
  { activity: "electricity", unit: "kWh", kgPerUnit: 0.67, scope: 2, source: "EXAMPLE - Ember Bangladesh", license: "CC-BY-4.0", year: 2026, version: "example" },
  { activity: "natural_gas", unit: "m3", kgPerUnit: 2.02, scope: 1, source: "EXAMPLE - UK DESNZ 2026", license: "OGL-3.0", year: 2026, version: "example" },
  { activity: "diesel", unit: "litre", kgPerUnit: 2.51, scope: 1, source: "EXAMPLE - UK DESNZ 2026", license: "OGL-3.0", year: 2026, version: "example" },
  { activity: "lpg", unit: "kg", kgPerUnit: 2.94, scope: 1, source: "EXAMPLE - UK DESNZ 2026", license: "OGL-3.0", year: 2026, version: "example" },
];

export const ACTIVITY_LABEL: Record<string, string> = {
  electricity: "বিদ্যুৎ (kWh)", natural_gas: "প্রাকৃতিক গ্যাস (m³)", diesel: "ডিজেল (লিটার)", lpg: "LPG (কেজি)",
};

export function findFactor(activity: string, unit: string) {
  return FACTORS.find((f) => f.activity === activity && f.unit === unit);
}
