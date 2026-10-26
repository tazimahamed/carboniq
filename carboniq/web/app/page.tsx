import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">বিলের ছবি থেকে buyer-ready কার্বন report</h1>
      <p className="max-w-2xl text-gray-700">
        বাংলাদেশের garment factory-র জন্য। বিল upload করুন, AI পড়ে নেবে, আপনি নিশ্চিত করবেন,
        আর প্রতিটা সংখ্যার প্রমাণসহ scope ১ ও ২ নির্গমনের হিসাব হবে।
      </p>
      <div className="flex gap-3">
        <Link href="/upload" className="rounded bg-emerald-700 px-4 py-2 text-white">বিল upload করুন</Link>
        <Link href="/dashboard" className="rounded border px-4 py-2">Dashboard দেখুন</Link>
      </div>
    </section>
  );
}
