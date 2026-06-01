"use client";

import { useState, useRef } from "react";
import { RankingList } from "./RankingList";
import { usePersistedState } from "@/hooks/usePersistedState";
import { cn } from "@/lib/utils";
import type { ListItemRow } from "@/lib/queries/lists";

const FAVORITES_TAB_KEY = "batchflix_favorites_prefs";

type Props = {
  moviesList: ListItemRow[];
  tvList: ListItemRow[];
  moviesListId: string;
  tvListId: string;
};

export function FavoritesPageClient({ moviesList, tvList, moviesListId, tvListId }: Props) {
  const [tab, setTab] = usePersistedState<"movie" | "tv">(
    FAVORITES_TAB_KEY,
    "movie"
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTabChange(next: "movie" | "tv") {
    if (next === tab) return;
    setIsTransitioning(true);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => setIsTransitioning(false), 200);
    setTab(next);
  }

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => handleTabChange("movie")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            tab === "movie"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          Movies
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("tv")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            tab === "tv"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          TV Shows
        </button>
      </div>

      {tab === "movie" && (
        <section className={cn("transition-opacity duration-200", isTransitioning && "opacity-50")}>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Movies
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {moviesList.length}
            </span>
          </div>
          <RankingList
            initialItems={moviesList}
            listId={moviesListId}
            mediaType="movie"
            listName="Favorite Movies"
          />
        </section>
      )}

      {tab === "tv" && (
        <section className={cn("transition-opacity duration-200", isTransitioning && "opacity-50")}>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              TV Shows
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {tvList.length}
            </span>
          </div>
          <RankingList
            initialItems={tvList}
            listId={tvListId}
            mediaType="tv"
            listName="Favorite TV Shows"
          />
        </section>
      )}
    </div>
  );
}
