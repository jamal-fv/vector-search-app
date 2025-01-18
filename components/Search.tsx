import { useState, useMemo } from "react";
import { Index } from "@upstash/vector";
import { OpenAI } from "openai";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Image from "next/image";

interface SearchProps {
  databases: {
    name: string;
    url: string;
    token: string;
  }[];
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Add media type options
const mediaTypes = [
  { value: "all", label: "All Media" },
  { value: "video", label: "Videos Only" },
  { value: "image", label: "Images Only" },
];

// Add source options
const sourceTypes = [
  { value: "all", label: "All Sources" },
  { value: "random", label: "Random" },
  { value: "luke", label: "Luke" },
];

interface SearchResult {
  id: string;
  score: number;
  metadata: {
    url: string;
    categories?: string;
    actions?: string;
    participants?: string;
    tags?: string;
    job_id: string;
  };
}

const createDynamicColumns = () => {
  const columnHelper = createColumnHelper<SearchResult>();
  const columns = [];

  // Media preview column
  columns.push(
    columnHelper.accessor("metadata.url", {
      header: "Media",
      cell: (info) => {
        const url = info.getValue();
        const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
        const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        if (isVideo) {
          return (
            <video controls className="max-w-[200px] max-h-[150px]" src={url}>
              Your browser does not support video playback.
            </video>
          );
        } else if (isImage) {
          return (
            <Image
              src={url}
              alt="Result media"
              width={200}
              height={150}
              className="object-contain"
            />
          );
        }
        return url;
      },
    })
  );

  // Add filename column
  columns.push(
    columnHelper.accessor("metadata.url", {
      id: "filename",
      header: "Filename",
      cell: (info) => {
        const url = info.getValue();
        return url.split("/").pop();
      },
    })
  );

  // Add score column
  columns.push(
    columnHelper.accessor("score", {
      header: "Score",
      cell: (info) => info.getValue().toFixed(4),
    })
  );

  // Define all possible metadata fields
  const allMetadataFields = [
    "categories",
    "actions",
    "participants",
    "tags",
    "job_id",
    "media_type",
    "source",
    "labels",
  ];

  // Add all metadata columns, even if they don't exist in current results
  allMetadataFields.forEach((key) => {
    // Skip URL as it's already handled
    if (key === "url") return;

    columns.push(
      columnHelper.accessor(
        (row) => row.metadata[key as keyof typeof row.metadata],
        {
          id: `metadata.${key}`,
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          cell: (info) => {
            const value = info.getValue();

            if (value === undefined || value === null) {
              return "N/A";
            }

            // Handle comma-separated lists (categories, tags, etc.)
            if (typeof value === "string" && value.includes(",")) {
              return (
                <div className="max-w-[300px] overflow-auto">
                  {value.split(", ").map((item, index) => (
                    <span
                      key={index}
                      className={`inline-block rounded-full px-2 py-1 text-xs mr-1 mb-1 ${
                        key === "categories"
                          ? "bg-gray-200"
                          : key === "tags"
                          ? "bg-gray-100"
                          : "bg-gray-50"
                      }`}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              );
            }

            // Return raw value for other types
            return value;
          },
        }
      )
    );
  });

  return columns;
};

export default function Search({ databases }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mediaType, setMediaType] = useState("all");
  const [sourceType, setSourceType] = useState("all");

  const getEmbedding = async (text: string) => {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.replace("\n", " "),
      dimensions: 512,
    });
    return response.data[0].embedding;
  };

  const handleSearch = async () => {
    if (!query) return;

    setLoading(true);
    try {
      const selectedDatabase = databases[0];
      if (!selectedDatabase) throw new Error("Database not found");

      const embedding = await getEmbedding(query);

      const index = new Index({
        url: selectedDatabase.url,
        token: selectedDatabase.token,
      });

      // Construct filter based on media type and source selections
      const filters = [];
      if (mediaType !== "all") {
        filters.push(`media_type = "${mediaType}"`);
      }
      if (sourceType !== "all") {
        filters.push(`source = "${sourceType}"`);
      }

      const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

      const searchResults = await index.query({
        vector: embedding,
        topK: 10,
        includeVectors: false,
        includeMetadata: true,
        filter,
      });

      setResults(searchResults as unknown as SearchResult[]);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => createDynamicColumns(), []);

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="bg-white dark:bg-gray-100 rounded-lg shadow-sm p-6 mb-8 border">
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Media Type</label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 
                       transition-all dark:text-gray-900"
            >
              {mediaTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Source</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 
                       transition-all dark:text-gray-900"
            >
              {sourceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Search Query
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="flex-1 p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 
                         transition-all dark:text-gray-900"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query}
                className="px-4 py-2 bg-foreground text-background rounded-md disabled:opacity-50"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-100 rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold dark:text-gray-900">
              Results
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-700">
              Found {results.length} matches
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-200">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-900"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-200"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 text-gray-800 dark:text-gray-900"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
