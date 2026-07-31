"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, Tv, Plus, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useListPicker } from "@/components/providers/ListPickerProvider";
import { usePersistedState } from "@/hooks/usePersistedState";
import { MediaTypeBadge } from "@/components/media/MediaTypeBadge";
import { StatusBadge } from "@/components/media/StatusBadge";
import { CardBadges } from "@/components/media/CardBadges";

const VIEW_PREF_KEY = "batchflix_view_preference";

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

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  watched: { bg: "bg-blue-900/60", text: "text-blue-200", label: "Watched" },
  watching: { bg: "bg-yellow-900/60", text: "text-yellow-200", label: "Watching" },
  watchlist: { bg: "bg-zinc-800/60", text: "text-zinc-300", label: "Watchlist" },
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
  const [view, setView] = usePersistedState<"grid" | "list">(VIEW_PREF_KEY, "grid");

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

      <div className="flex items-center justify-between gap-3">
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

        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Grid view"
            className={cn(
              "rounded-l-md p-2 transition-colors",
              view === "grid"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="List view"
            className={cn(
              "rounded-r-md p-2 transition-colors",
              view === "list"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {allItems.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No titles found
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {allItems.map((item) => {
            const key = `${item.id}-${item.media_type}`;
            const entry = libraryMap[key] ?? null;
            const title = item.title ?? item.name ?? "Unknown";
            const dateStr = item.release_date ?? item.first_air_date
            const formattedDate = (() => {
              if (!dateStr) return null
              const [y, m, d] = dateStr.split('-')
              return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            })()

            return (
              <div key={key} className="group relative flex flex-col">
                <Link href={`/media/${item.media_type}/${item.id}`}>
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-secondary">
                    {item.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                        alt={title}
                        fill
                        unoptimized
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

                    <MediaTypeBadge mediaType={item.media_type} />

                    <CardBadges releaseDate={dateStr} />

                    {!entry && (
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
                      <StatusBadge status={entry.status as "watched" | "watching" | "watchlist"} />
                    )}
                  </div>
                </Link>
                <p className="mt-1 truncate text-xs font-medium text-foreground">
                  {title}
                </p>
                {formattedDate && (
                  <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {allItems.map((item) => {
            const key = `${item.id}-${item.media_type}`;
            const entry = libraryMap[key] ?? null;
            const title = item.title ?? item.name ?? "Unknown";
            const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
            const pill = entry ? (STATUS_PILL[entry.status] ?? STATUS_PILL.watchlist) : null;

            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-card/80"
              >
                <Link
                  href={`/media/${item.media_type}/${item.id}`}
                  className="relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded"
                >
                  {item.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                      alt={title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary">
                      {item.media_type === "movie" ? (
                        <Film className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Tv className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </Link>

                <Link
                  href={`/media/${item.media_type}/${item.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {year && (
                      <span className="text-xs text-muted-foreground">{year}</span>
                    )}
                    <span
                      className={cn(
                        "rounded px-1 py-0.5 text-[10px] font-medium text-white",
                        item.media_type === "movie" ? "bg-[#2563EB]" : "bg-[#7c3aed]"
                      )}
                    >
                      {item.media_type === "movie" ? "Movie" : "TV"}
                    </span>
                    <CardBadges
                      variant="inline"
                      releaseDate={item.release_date ?? item.first_air_date}
                    />
                  </div>
                </Link>

                <div className="flex-shrink-0">
                  {pill ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        pill.bg,
                        pill.text
                      )}
                    >
                      {pill.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleAdd(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB] text-white"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
