"use client";

import Search from "../components/Search";

const databases = [
  {
    name: "Local Database",
    url: process.env.NEXT_PUBLIC_UPSTASH_DB_LOCAL_URL!,
    token: process.env.NEXT_PUBLIC_UPSTASH_DB_LOCAL_TOKEN!,
  }
];

export default function Home() {
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-black">
      <main className="max-w-7xl mx-auto animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
          Content Tagging Vector Search
        </h1>
        <Search databases={databases} />
      </main>
    </div>
  );
}
