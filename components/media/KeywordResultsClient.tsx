"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, Tv, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useListPicker } from "@/components/providers/ListPickerProvider";

type MediaType = "all" | "movie" | "tv";

type TMDBItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: "movie" | "tv";
};

type LibraryEntry = { status: string; userMediaId: string };

type Props = {
  keywordName: string;
  movies: TMDBItem[];
  tvShows: TMDBItem[];
  initialLibraryMap: Record<string, LibraryEntry>;
};

export function KeywordResultsClient({
  keywordName,
  movies,
  tvShows,
  initialLibraryMap,
}: Props) {
  const { openListPicker } = useListPicker();
  const [mediaFilter, setMediaFilter] = useState<MediaType>("all");
  const [libraryMap, setLibraryMap] =
    useState<Record<string, LibraryEntry>>(initialLibraryMap);

  const allItems: TMDBItem[] =
    mediaFilter === "movie"
      ? movies
      : mediaFilter === "tv"
      ? tvShows
      : [...movies, ...tvShows].sort((a, b) => b.vote_average - a.vote_average);

  async function handleAdd(item: TMDBItem) {
    const key = `${item.id}-${item.media_type}`;
    try {
      const res = await fetch("/api/library/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: item.id,
          mediaType: item.media_type,
          status: "watchlist",
        }),
      });
      if (!res.ok) throw new Error();
      const result = (await res.json()) as { id: string; media_id: string };
      setLibraryMap((prev) => ({
        ...prev,
        [key]: { status: "watchlist", userMediaId: result.id },
      }));
      toast("Added to Watchlist", {
        action: {
          label: "Add to List",
          onClick: () => openListPicker(result.media_id),
        },
      });
    } catch {
      toast.error("Could not add to library");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{keywordName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {allItems.length} titles
        </p>
      </div>

      <div className="flex gap-1.5">
        {(["all", "movie", "tv"] as MediaType[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setMediaFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              mediaFilter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            {f === "all" ? "All" : f === "movie" ? "Movies" : "TV Shows"}
          </button>
        ))}
      </div>

      {allItems.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No titles found
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {allItems.map((item) => {
            const key = `${item.id}-${item.media_type}`;
            const entry = libraryMap[key] ?? null;
            const title = item.title ?? item.name ?? "Unknown";
            const year = (
              item.release_date ?? item.first_air_date ?? ""
            ).slice(0, 4);

            return (
              <div key={key} className="group relative flex flex-col">
                <Link href={`/media/${item.media_type}/${item.id}`}>
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-secondary">
                    {item.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, 20vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {item.media_type === "movie" ? (
                          <Film className="h-6 w-6 text-muted-foreground/40" />
                        ) : (
                          <Tv className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>
                    )}

                    {entry ? (
                      <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/90">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          void handleAdd(item);
                        }}
                        className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB] text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}

                    {entry && (
                      <div
                        className={cn(
                          "absolute bottom-0 left-0 right-0 rounded-b-lg py-0.5 text-center text-[10px] font-medium",
                          entry.status === "watched"
                            ? "bg-blue-900/80 text-blue-200"
                            : entry.status === "watching"
                            ? "bg-yellow-900/80 text-yellow-200"
                            : "bg-zinc-800/80 text-zinc-300"
                        )}
                      >
                        {entry.status === "watched"
                          ? "Watched"
                          : entry.status === "watching"
                          ? "Watching"
                          : "Watchlist"}
                      </div>
                    )}
                  </div>
                </Link>
                <p className="mt-1 truncate text-xs font-medium text-foreground">
                  {title}
                </p>
                {year && (
                  <p className="text-xs text-muted-foreground">{year}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
