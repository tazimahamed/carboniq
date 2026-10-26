// নির্গমন = কার্যক্রম × গুণক। AI নেই — একই input-এ সবসময় একই ফল।
import { findFactor } from "./factors";

export function calculate(activity: string, quantity: number, unit: string) {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error("পরিমাণ সঠিক নয়");
  const f = findFactor(activity, unit);
  if (!f) throw new Error(`গুণক পাওয়া যায়নি: ${activity} / ${unit}`);
  const kg = quantity * f.kgPerUnit;
  return {
    activity, quantity, unit, scope: f.scope,
    kg_co2e: Math.round(kg * 1000) / 1000,
    tonnes_co2e: Math.round(kg / 1000 * 10000) / 10000,
    factor: f.kgPerUnit, factor_source: f.source, factor_version: f.version,
    formula: `${quantity} ${unit} × ${f.kgPerUnit} kgCO2e/${unit}`,
  };
}
