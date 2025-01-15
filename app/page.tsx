"use client";

import Search from "../components/Search";

const databases = [
  {
    name: "Combined & Concatenated",
    url: process.env.NEXT_PUBLIC_UPSTASH_DB_1_URL!,
    token: process.env.NEXT_PUBLIC_UPSTASH_DB_1_TOKEN!,
  },
  {
    name: "Categories Only",
    url: process.env.NEXT_PUBLIC_UPSTASH_DB_2_URL!,
    token: process.env.NEXT_PUBLIC_UPSTASH_DB_2_TOKEN!,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">
          Content Tagging Vector Search
        </h1>
        <Search databases={databases} />
      </main>
    </div>
  );
}
