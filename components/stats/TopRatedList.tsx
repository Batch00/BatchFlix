"use client";

import Image from "next/image";
import Link from "next/link";
import { Film, Tv } from "lucide-react";
import type { TopRatedItem, StatsItem } from "@/lib/queries/stats";

type Props = {
  items: TopRatedItem[];
  allItems?: StatsItem[];
  onDrillDown?: (title: string, items: StatsItem[]) => void;
};

export function TopRatedList({ items, allItems, onDrillDown }: Props) {
  function handleViewAll() {
    if (!onDrillDown || !allItems) return;
    const rated = allItems
      .filter((item) => item.rating !== null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    onDrillDown("All Rated", rated);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Top Rated
        </h3>
        {onDrillDown && allItems && (
          <button
            type="button"
            onClick={handleViewAll}
            className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            View all rated
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rated titles yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, i) => {
            const year = item.releaseDate
              ? +item.releaseDate.slice(0, 4)
              : null;
            const displayRating = (item.rating / 2).toFixed(1);

            return (
              <Link
                key={item.id}
                href={`/media/${item.mediaType}/${item.tmdbId}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
              >
                <span className="w-5 flex-shrink-0 text-right font-mono text-sm text-muted-foreground">
                  {i + 1}
                </span>
                <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded">
                  {item.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                      alt={item.title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="32px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary">
                      {item.mediaType === "movie" ? (
                        <Film className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Tv className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  {year && (
                    <p className="text-xs text-muted-foreground">{year}</p>
                  )}
                </div>
                <span className="flex-shrink-0 text-sm font-semibold text-primary">
                  {displayRating}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                    / 5
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
