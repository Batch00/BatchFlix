"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Tv, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { handleDemoResponse } from "@/lib/demo";
import { useListPicker } from "@/components/providers/ListPickerProvider";
import { MediaTypeBadge } from "@/components/media/MediaTypeBadge";
import { StatusBadge } from "@/components/media/StatusBadge";
import { CardBadges } from "@/components/media/CardBadges";

export type DiscoverItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
};

type Props = {
  title: string;
  items: DiscoverItem[];
  initialLibraryMap: Record<string, string>;
  viewMode?: "grid" | "list";
};

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  watched: { bg: "bg-blue-900/60", text: "text-blue-200", label: "Watched" },
  watching: { bg: "bg-yellow-900/60", text: "text-yellow-200", label: "Watching" },
  watchlist: { bg: "bg-zinc-800/60", text: "text-zinc-300", label: "Watchlist" },
};

export function DiscoverRow({ title, items, initialLibraryMap, viewMode = "grid" }: Props) {
  const router = useRouter();
  const { openListPicker } = useListPicker();
  const [libraryMap, setLibraryMap] = useState(initialLibraryMap);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateScrollButtons() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items]);

  async function handleAdd(item: DiscoverItem) {
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
      if (handleDemoResponse(res)) return;
      if (!res.ok) throw new Error();
      const result = (await res.json()) as { id: string; media_id: string };
      setLibraryMap((prev) => ({ ...prev, [key]: "watchlist" }));
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

  if (!items.length) return null;

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const key = `${item.id}-${item.media_type}`;
            const status = libraryMap[key] ?? null;
            const itemTitle = item.title ?? item.name ?? "Unknown";
            const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
            const pill = status ? (STATUS_PILL[status] ?? STATUS_PILL.watchlist) : null;

            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:bg-card/80"
              >
                <Link
                  href={`/media/${item.media_type}/${item.id}`}
                  className="relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded bg-[#1f1f1f]"
                >
                  {item.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                      alt={itemTitle}
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
                    {itemTitle}
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="relative">
        {/* Left scroll button -- desktop only */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: -400, behavior: "smooth" })}
            className="absolute left-0 top-1/2 z-10 hidden -translate-x-2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 p-1.5 backdrop-blur-sm md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {items.map((item) => {
            const key = `${item.id}-${item.media_type}`;
            const status = libraryMap[key] ?? null;
            const itemTitle = item.title ?? item.name ?? "Unknown";
            const dateStr = item.release_date ?? item.first_air_date
            const formattedDate = (() => {
              if (!dateStr) return null
              const [y, m, d] = dateStr.split('-')
              return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            })()

            return (
              <div key={key} className="relative flex w-[120px] flex-shrink-0 flex-col">
                <Link href={`/media/${item.media_type}/${item.id}`}>
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-secondary">
                    {item.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                        alt={itemTitle}
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

                    <MediaTypeBadge mediaType={item.media_type} />

                    <CardBadges releaseDate={dateStr} />

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
                  {itemTitle}
                </p>
                {formattedDate && (
                  <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Right scroll button -- desktop only */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: 400, behavior: "smooth" })}
            className="absolute right-0 top-1/2 z-10 hidden translate-x-2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 p-1.5 backdrop-blur-sm md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
