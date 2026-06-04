"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Tv, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { TMDBSearchResult } from "@/lib/tmdb";

type Props = {
  recommendations: TMDBSearchResult[];
  userLibraryMap: Record<string, string>;
};

export function RecommendationsSection({
  recommendations,
  userLibraryMap: initialMap,
}: Props) {
  const router = useRouter();
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
      if (!res.ok) throw new Error();
      const result = await res.json() as { id: string };
      setLibraryMap((prev) => ({
        ...prev,
        [`${item.media_type}:${item.id}`]: "watchlist",
      }));
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
                delete next[`${item.media_type}:${item.id}`];
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

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        More Like This
      </h2>
      <div
        className="flex gap-3 overflow-x-auto pb-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item) => {
          const title = item.title ?? item.name ?? "Unknown";
          const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
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

                  {status ? (
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

                  {status && (
                    <div
                      className={cn(
                        "absolute bottom-0 left-0 right-0 rounded-b-lg py-0.5 text-center text-[10px] font-medium",
                        status === "watched"
                          ? "bg-blue-900/80 text-blue-200"
                          : status === "watching"
                          ? "bg-yellow-900/80 text-yellow-200"
                          : "bg-zinc-800/80 text-zinc-300"
                      )}
                    >
                      {status === "watched"
                        ? "Watched"
                        : status === "watching"
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
    </div>
  );
}
