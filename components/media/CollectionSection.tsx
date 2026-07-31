"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Film, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { handleDemoResponse } from "@/lib/demo";
import { useListPicker } from "@/components/providers/ListPickerProvider";
import { MediaTypeBadge } from "@/components/media/MediaTypeBadge";
import { StatusBadge } from "@/components/media/StatusBadge";
import { CardBadges } from "@/components/media/CardBadges";
import type { TMDBCollection } from "@/lib/tmdb";

type Props = {
  collection: TMDBCollection;
  currentTmdbId: number;
  userLibraryMap: Record<string, string>;
};

export function CollectionSection({
  collection,
  currentTmdbId,
  userLibraryMap: initialMap,
}: Props) {
  const router = useRouter();
  const { openListPicker } = useListPicker();
  const [libraryMap, setLibraryMap] = useState(initialMap);
  // Declared with the other hooks: it used to sit below the early return,
  // so the hook order changed with the number of collection parts.
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  const parts = [...collection.parts].sort((a, b) =>
    (a.release_date ?? "").localeCompare(b.release_date ?? "")
  );

  if (parts.length < 2) return null;

  async function handleAdd(id: number) {
    try {
      const res = await fetch("/api/library/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: id, mediaType: "movie", status: "watchlist" }),
      });
      if (handleDemoResponse(res)) return;
      if (!res.ok) throw new Error();
      const result = await res.json() as { id: string; media_id: string };
      setLibraryMap((prev) => ({ ...prev, [`movie:${id}`]: "watchlist" }));
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

  const truncateOverview =
    !overviewExpanded && (collection.overview?.length ?? 0) > 300;

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Layers className="h-5 w-5 text-muted-foreground" />
        Part of {collection.name}
      </h2>

      <div
        className="flex gap-3 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {parts.map((part) => {
          const isCurrent = part.id === currentTmdbId;
          const status = libraryMap[`movie:${part.id}`] ?? null;
          const formattedDate = (() => {
            if (!part.release_date) return null
            const [y, m, d] = part.release_date.split('-')
            return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          })()

          return (
            <div
              key={part.id}
              className="relative flex w-[120px] flex-shrink-0 flex-col"
            >
              <Link href={`/media/movie/${part.id}`}>
                <div
                  className={cn(
                    "relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-secondary",
                    isCurrent && "ring-2 ring-[#2563EB]"
                  )}
                >
                  {part.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${part.poster_path}`}
                      alt={part.title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="120px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Film className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}

                  <MediaTypeBadge mediaType="movie" />

                  <CardBadges releaseDate={part.release_date} />

                  {status ? (
                    <StatusBadge status={status as "watched" | "watching" | "watchlist"} />
                  ) : (
                    !isCurrent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          void handleAdd(part.id);
                        }}
                        className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB] text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )
                  )}
                </div>
              </Link>
              <p className="mt-1 truncate text-xs font-medium text-foreground">
                {part.title}
              </p>
              {formattedDate && (
                <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
              )}
            </div>
          );
        })}
      </div>

      {collection.overview && (
        <div>
          <p
            className={cn(
              "text-sm leading-relaxed text-muted-foreground",
              truncateOverview && "line-clamp-3"
            )}
          >
            {collection.overview}
          </p>
          {(collection.overview?.length ?? 0) > 300 && (
            <button
              type="button"
              onClick={() => setOverviewExpanded(!overviewExpanded)}
              className="mt-1 text-xs text-primary hover:underline"
            >
              {overviewExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
