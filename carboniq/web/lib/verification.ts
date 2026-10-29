// যাচাইয়ের তিন স্তর — একটা আরেকটাকে স্বয়ংক্রিয়ভাবে বোঝায় না; প্রতিটার নিজস্ব প্রমাণ লাগে
export type VEvent = { id?: number; target_type: string; target_id: string; level: "factory_review" | "independent" | string; reviewer: string; organization: string; scope: string; reference?: string | null; statement?: string | null; created_at: string; hash: string };

export const LEVELS = [
  { key: "calculated", title: "System-এর হিসাব", desc: "ইনপুট, গুণক আর পদ্ধতি দিয়ে CarbonIQ হিসাব করেছে — এটা স্বাধীন যাচাই নয়" },
  { key: "factory_review", title: "কারখানার যাচাই", desc: "কারখানার দায়িত্বপ্রাপ্ত ব্যক্তি মূল বিল আর record মিলিয়ে দেখেছেন" },
  { key: "independent", title: "স্বাধীন যাচাই", desc: "স্বাধীন যাচাইকারী নির্দিষ্ট পরিধি ও পদ্ধতিতে যাচাই করে রিপোর্ট দিয়েছেন" },
] as const;

export function verificationStatus(events: VEvent[], targetType: string, targetId: string) {
  const mine = events.filter((e) => e.target_type === targetType && e.target_id === targetId);
  const latest = (lvl: string) => mine.filter((e) => e.level === lvl).at(-1) ?? null;
  const factory = latest("factory_review"), independent = latest("independent");
  const highest = independent ? "independent" : factory ? "factory_review" : "calculated";
  return { calculated: true, factory, independent, highest, history: mine };
}
