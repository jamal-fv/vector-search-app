import { useState, useMemo } from "react";
import { Index } from "@upstash/vector";
import { OpenAI } from "openai";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

interface SearchProps {
  databases: {
    name: string;
    url: string;
    token: string;
  }[];
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, you should use server-side API calls
});

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

const createDynamicColumns = (results: SearchResult[]) => {
  if (!results.length) return [];

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
            <img
              src={url}
              alt="Result media"
              className="max-w-[200px] max-h-[150px] object-contain"
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

  // Dynamically add metadata columns
  if (results[0].metadata) {
    Object.keys(results[0].metadata).forEach((key) => {
      // Skip URL as it's already handled
      if (key === "url") return;

      columns.push(
        columnHelper.accessor(
          (row) => row.metadata[key as keyof typeof row.metadata],
          {
            id: `metadata.${key}`,
            header:
              key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
            cell: (info) => {
              const value = info.getValue();

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
  }

  return columns;
};

export default function Search({ databases }: SearchProps) {
  const [query, setQuery] = useState("");
  const [selectedDB, setSelectedDB] = useState(databases[0]?.name || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const getEmbedding = async (text: string) => {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.replace("\n", " "),
      dimensions: 512,
    });
    return response.data[0].embedding;
  };

  const handleSearch = async () => {
    if (!query || !selectedDB) return;

    setLoading(true);
    try {
      const selectedDatabase = databases.find((db) => db.name === selectedDB);
      if (!selectedDatabase) throw new Error("Database not found");

      // Get embedding from OpenAI
      const embedding = await getEmbedding(query);

      const index = new Index({
        url: selectedDatabase.url,
        token: selectedDatabase.token,
      });

      const searchResults = await index.query({
        vector: embedding,
        topK: 10,
        includeVectors: false,
        includeMetadata: true,
      });

      setResults(searchResults as unknown as SearchResult[]);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => createDynamicColumns(results), [results]);

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <div className="space-y-2">
        <select
          value={selectedDB}
          onChange={(e) => setSelectedDB(e.target.value)}
          className="w-full p-2 border rounded-md"
        >
          <option value="">Select Database</option>
          {databases.map((db) => (
            <option key={db.name} value={db.name}>
              {db.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            className="flex-1 p-2 border rounded-md"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query || !selectedDB}
            className="px-4 py-2 bg-foreground text-background rounded-md disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4 overflow-x-auto">
          <h2 className="text-lg font-semibold">Results:</h2>
          <table className="min-w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="border p-2 bg-gray-50">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border p-2">
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
      )}
    </div>
  );
}
