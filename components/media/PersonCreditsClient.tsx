"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Tv, Check, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { TMDBPersonCredit } from "@/lib/tmdb";

type Tab = "acting" | "directing";
type MediaFilter = "all" | "movie" | "tv";

type Props = {
  biography: string;
  castCredits: TMDBPersonCredit[];
  directingCredits: TMDBPersonCredit[];
  libraryMap: Record<string, string>;
};

function CreditCard({
  credit,
  status,
  onAdd,
}: {
  credit: TMDBPersonCredit;
  status: string | null;
  onAdd: (credit: TMDBPersonCredit) => void;
}) {
  const title = credit.title ?? credit.name ?? "Unknown";
  const year = (credit.release_date ?? credit.first_air_date ?? "").slice(0, 4);

  return (
    <div className="group relative flex flex-col">
      <Link href={`/media/${credit.media_type}/${credit.id}`}>
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-secondary">
          {credit.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${credit.poster_path}`}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {credit.media_type === "movie" ? (
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
                onAdd(credit);
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
      <p className="mt-1 truncate text-xs font-medium text-foreground">{title}</p>
      {year && <p className="text-xs text-muted-foreground">{year}</p>}
    </div>
  );
}

export function PersonCreditsClient({
  biography,
  castCredits,
  directingCredits,
  libraryMap: initialMap,
}: Props) {
  const router = useRouter();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("acting");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [libraryOnly, setLibraryOnly] = useState(false);
  const [libraryMap, setLibraryMap] = useState(initialMap);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const hasBoth = castCredits.length > 0 && directingCredits.length > 0;
  const activeCredits =
    activeTab === "acting" ? castCredits : directingCredits;

  const filtered = activeCredits
    .filter((c) => mediaFilter === "all" || c.media_type === mediaFilter)
    .filter(
      (c) => !libraryOnly || !!libraryMap[`${c.media_type}:${c.id}`]
    );

  async function handleAdd(credit: TMDBPersonCredit) {
    try {
      const res = await fetch("/api/library/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: credit.id,
          mediaType: credit.media_type,
          status: "watchlist",
        }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json() as { id: string };
      setLibraryMap((prev) => ({
        ...prev,
        [`${credit.media_type}:${credit.id}`]: "watchlist",
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
                delete next[`${credit.media_type}:${credit.id}`];
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

  const longBio = biography.length > 300;
  const truncateBio = longBio && !bioExpanded;

  return (
    <div className="flex flex-col gap-6">
      {biography.length > 0 && (
        <div>
          <p
            className={cn(
              "text-sm leading-relaxed text-muted-foreground",
              truncateBio && "line-clamp-3"
            )}
          >
            {biography}
          </p>
          {longBio && (
            <button
              type="button"
              onClick={() => setBioExpanded(!bioExpanded)}
              className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {bioExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Read less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Read more
                </>
              )}
            </button>
          )}
        </div>
      )}

      {hasBoth && (
        <div className="flex gap-2">
          {(["acting", "directing"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {tab === "acting" ? "Acting" : "Directing"}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {(["all", "movie", "tv"] as MediaFilter[]).map((f) => (
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

        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={libraryOnly}
            onChange={(e) => setLibraryOnly(e.target.checked)}
            className="rounded border-border bg-secondary accent-primary"
          />
          <span className="text-xs text-muted-foreground">In your library</span>
        </label>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
          {filtered.map((credit) => (
            <CreditCard
              key={`${credit.media_type}-${credit.id}`}
              credit={credit}
              status={libraryMap[`${credit.media_type}:${credit.id}`] ?? null}
              onAdd={handleAdd}
            />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No credits found
        </p>
      )}
    </div>
  );
}
