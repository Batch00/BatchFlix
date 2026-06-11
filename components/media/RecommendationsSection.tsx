"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, Tv, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { handleDemoResponse } from "@/lib/demo";
import { useListPicker } from "@/components/providers/ListPickerProvider";
import { MediaTypeBadge } from "@/components/media/MediaTypeBadge";
import { StatusBadge } from "@/components/media/StatusBadge";
import type { TMDBSearchResult } from "@/lib/tmdb";

type Props = {
  recommendations: TMDBSearchResult[];
  userLibraryMap: Record<string, string>;
};

export function RecommendationsSection({
  recommendations,
  userLibraryMap: initialMap,
}: Props) {
  const { openListPicker } = useListPicker();
  const [libraryMap, setLibraryMap] = useState(initialMap);

  const items = recommendations
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 10);

  if (!items.length) return null;

  async function handleAdd(item: TMDBSearchResult) {
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
      if (handleDemoResponse(res)) return;
      if (!res.ok) throw new Error();
      const result = await res.json() as { id: string; media_id: string };
      setLibraryMap((prev) => ({
        ...prev,
        [`${item.media_type}:${item.id}`]: "watchlist",
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
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        More Like This
      </h2>
      <div
        className="flex gap-3 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item) => {
          const title = item.title ?? item.name ?? "Unknown";
          const dateStr = item.release_date ?? item.first_air_date
          const isUpcoming = (() => {
            if (!dateStr) return false
            const [y, m, d] = dateStr.split('-')
            return new Date(+y, +m - 1, +d) > new Date()
          })()
          const formattedDate = (() => {
            if (!dateStr) return null
            const [y, m, d] = dateStr.split('-')
            return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          })()
          const key = `${item.media_type}:${item.id}`;
          const status = libraryMap[key] ?? null;

          return (
            <div
              key={key}
              className="group relative flex w-[120px] flex-shrink-0 flex-col"
            >
              <Link href={`/media/${item.media_type}/${item.id}`}>
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-secondary">
                  {item.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                      alt={title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="120px"
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

                  <MediaTypeBadge mediaType={item.media_type as "movie" | "tv"} />

                  {isUpcoming && (
                    <div className="absolute right-1 top-1 z-10 rounded-full bg-yellow-500/90 px-1.5 py-0.5 text-[9px] font-bold text-black">
                      UPCOMING
                    </div>
                  )}

                  {!status && (
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

                  {status && (
                    <StatusBadge status={status as "watched" | "watching" | "watchlist"} />
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
    </div>
  );
}
