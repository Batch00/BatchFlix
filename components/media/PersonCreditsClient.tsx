"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, Tv, Plus, ChevronDown, ChevronUp, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useListPicker } from "@/components/providers/ListPickerProvider";
import { usePersistedState } from "@/hooks/usePersistedState";
import { MediaTypeBadge } from "@/components/media/MediaTypeBadge";
import { StatusBadge } from "@/components/media/StatusBadge";
import { CardBadges } from "@/components/media/CardBadges";
import type { TMDBPersonCredit } from "@/lib/tmdb";

type Tab = "acting" | "directing";
type MediaFilter = "all" | "movie" | "tv";
type ViewMode = "grid" | "list";

const VIEW_PREF_KEY = "batchflix_view_preference";

const TALK_SHOW_PATTERN =
  /tonight show|late night|late show|jimmy|conan|ellen|colbert|kimmel|fallon|daily show|\bthe view\b|kelly|seth meyers/i;

const EXCLUDED_SHOW_IDS = [1667]; // SNL

function isTalkShow(credit: TMDBPersonCredit): boolean {
  if (EXCLUDED_SHOW_IDS.includes(credit.id)) return true;
  if (credit.genre_ids?.includes(10767)) return true;
  const name = credit.title ?? credit.name ?? "";
  return TALK_SHOW_PATTERN.test(name);
}

function deduplicateCredits(credits: TMDBPersonCredit[]): TMDBPersonCredit[] {
  const seen = new Map<string, TMDBPersonCredit>();
  for (const credit of credits) {
    const key = `${credit.id}-${credit.media_type}`;
    if (!seen.has(key)) seen.set(key, credit);
  }
  return Array.from(seen.values());
}

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  watched: { bg: "bg-blue-900/60", text: "text-blue-200", label: "Watched" },
  watching: { bg: "bg-yellow-900/60", text: "text-yellow-200", label: "Watching" },
  watchlist: { bg: "bg-zinc-800/60", text: "text-zinc-300", label: "Watchlist" },
};

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
  const dateStr = credit.release_date ?? credit.first_air_date
  const formattedDate = (() => {
    if (!dateStr) return null
    const [y, m, d] = dateStr.split('-')
    return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  })()

  return (
    <div className="group relative flex flex-col">
      <Link href={`/media/${credit.media_type}/${credit.id}`}>
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-secondary">
          {credit.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${credit.poster_path}`}
              alt={title}
              fill
              unoptimized
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

          <MediaTypeBadge mediaType={credit.media_type} />

          <CardBadges releaseDate={dateStr} />

          {!status && (
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
            <StatusBadge status={status as "watched" | "watching" | "watchlist"} />
          )}
        </div>
      </Link>
      <p className="mt-1 truncate text-xs font-medium text-foreground">{title}</p>
      {formattedDate && <p className="text-[10px] text-muted-foreground">{formattedDate}</p>}
    </div>
  );
}

function CreditListRow({
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
  const pill = status ? (STATUS_PILL[status] ?? STATUS_PILL.watchlist) : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-card/80">
      <Link
        href={`/media/${credit.media_type}/${credit.id}`}
        className="relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded bg-[#1f1f1f]"
      >
        {credit.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${credit.poster_path}`}
            alt={title}
            fill
            unoptimized
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            {credit.media_type === "movie" ? (
              <Film className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Tv className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        )}
      </Link>

      <Link
        href={`/media/${credit.media_type}/${credit.id}`}
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {year && <span className="text-xs text-muted-foreground">{year}</span>}
          <span
            className={cn(
              "rounded px-1 py-0.5 text-[10px] font-medium text-white",
              credit.media_type === "movie" ? "bg-[#2563EB]" : "bg-[#7c3aed]"
            )}
          >
            {credit.media_type === "movie" ? "Movie" : "TV"}
          </span>
          <CardBadges
            variant="inline"
            releaseDate={credit.release_date ?? credit.first_air_date}
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
            onClick={() => onAdd(credit)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB] text-white"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function PersonCreditsClient({
  biography,
  castCredits,
  directingCredits,
  libraryMap: initialMap,
}: Props) {
  const { openListPicker } = useListPicker();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("acting");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [libraryOnly, setLibraryOnly] = useState(false);
  const [libraryMap, setLibraryMap] = useState(initialMap);
  const [view, setView] = usePersistedState<ViewMode>(VIEW_PREF_KEY, "grid");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const filteredCast = deduplicateCredits(castCredits.filter((c) => !isTalkShow(c)));
  const filteredDirecting = deduplicateCredits(directingCredits.filter((c) => !isTalkShow(c)));

  const hasBoth = filteredCast.length > 0 && filteredDirecting.length > 0;
  const activeCredits =
    activeTab === "acting" ? filteredCast : filteredDirecting;

  const filtered = activeCredits
    .filter((c) => mediaFilter === "all" || c.media_type === mediaFilter)
    .filter(
      (c) => !libraryOnly || !!libraryMap[`${c.id}-${c.media_type}`]
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
      const result = await res.json() as { id: string; media_id: string };
      setLibraryMap((prev) => ({
        ...prev,
        [`${credit.id}-${credit.media_type}`]: "watchlist",
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

      <div className="flex flex-wrap items-center justify-between gap-3">
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

      {filtered.length > 0 ? (
        view === "grid" ? (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
            {filtered.map((credit) => (
              <CreditCard
                key={`${credit.media_type}-${credit.id}`}
                credit={credit}
                status={libraryMap[`${credit.id}-${credit.media_type}`] ?? null}
                onAdd={handleAdd}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((credit) => (
              <CreditListRow
                key={`${credit.media_type}-${credit.id}`}
                credit={credit}
                status={libraryMap[`${credit.id}-${credit.media_type}`] ?? null}
                onAdd={handleAdd}
              />
            ))}
          </div>
        )
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No credits found
        </p>
      )}
    </div>
  );
}
