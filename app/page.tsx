"use client";

import Search from "../components/Search";

const databases = [
  {
    name: "Combined & Concatenated",
    url: process.env.NEXT_PUBLIC_UPSTASH_DB_COMBINED_URL!,
    token: process.env.NEXT_PUBLIC_UPSTASH_DB_COMBINED_TOKEN!,
  },
  {
    name: "Categories Only",
    url: process.env.NEXT_PUBLIC_UPSTASH_DB_CATEGORIES_URL!,
    token: process.env.NEXT_PUBLIC_UPSTASH_DB_CATEGORIES_TOKEN!,
  },
  {
    name: "Tags Only",
    url: process.env.NEXT_PUBLIC_UPSTASH_DB_TAGS_URL!,
    token: process.env.NEXT_PUBLIC_UPSTASH_DB_TAGS_TOKEN!,
  },
  {
    name: "Images Only",
    url: process.env.NEXT_PUBLIC_UPSTASH_DB_IMAGES_URL!,
    token: process.env.NEXT_PUBLIC_UPSTASH_DB_IMAGES_TOKEN!,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-black">
      <main className="max-w-7xl mx-auto animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
          Content Tagging Vector Search
        </h1>
        <Search databases={databases} />
      </main>
    </div>
  );
}
