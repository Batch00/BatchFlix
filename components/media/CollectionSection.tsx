"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Film, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
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
  const [libraryMap, setLibraryMap] = useState(initialMap);

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
      if (!res.ok) throw new Error();
      const result = await res.json() as { id: string };
      setLibraryMap((prev) => ({ ...prev, [`movie:${id}`]: "watchlist" }));
      toast("Added to Watchlist", {
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              await fetch("/api/library/remove", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userMediaId: result.id }),
              });
              setLibraryMap((prev) => {
                const next = { ...prev };
                delete next[`movie:${id}`];
                return next;
              });
              toast("Removed");
              router.refresh();
            })();
          },
        },
      });
    } catch {
      toast.error("Could not add to library");
    }
  }

  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const truncateOverview =
    !overviewExpanded && (collection.overview?.length ?? 0) > 300;

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Layers className="h-5 w-5 text-muted-foreground" />
        Part of {collection.name}
      </h2>

      <div
        className="flex gap-3 overflow-x-auto pb-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {parts.map((part) => {
          const isCurrent = part.id === currentTmdbId;
          const status = libraryMap[`movie:${part.id}`] ?? null;

          return (
            <div
              key={part.id}
              className="group relative flex w-[120px] flex-shrink-0 flex-col"
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
                      className="object-cover"
                      sizes="120px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Film className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}

                  {status === "watched" ? (
                    <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/90">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  ) : status ? (
                    <div className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-yellow-400" />
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
              {part.release_date && (
                <p className="text-xs text-muted-foreground">
                  {part.release_date.slice(0, 4)}
                </p>
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
