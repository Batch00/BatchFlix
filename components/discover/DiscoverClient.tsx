"use client";

import { useState, useEffect } from "react";
import { Compass, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersistedState } from "@/hooks/usePersistedState";
import { DiscoverRow, type DiscoverItem } from "./DiscoverRow";

const TAB_KEY = "batchflix_discover_tab";
const VIEW_PREF_KEY = "batchflix_view_preference";

type Tab = "movies" | "tv";

type Props = {
  trendingMovies: DiscoverItem[];
  nowPlaying: DiscoverItem[];
  popularMovies: DiscoverItem[];
  topRatedMovies: DiscoverItem[];
  trendingTv: DiscoverItem[];
  onTheAir: DiscoverItem[];
  popularTv: DiscoverItem[];
  topRatedTv: DiscoverItem[];
  libraryMap: Record<string, string>;
};

export function DiscoverClient({
  trendingMovies,
  nowPlaying,
  popularMovies,
  topRatedMovies,
  trendingTv,
  onTheAir,
  popularTv,
  topRatedTv,
  libraryMap,
}: Props) {
  const [tab, setTab] = useState<Tab>("movies");
  const [view, setView] = usePersistedState<"grid" | "list">(VIEW_PREF_KEY, "grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (saved === "movies" || saved === "tv") setTab(saved);
    } catch {
      // ignore
    }
  }, []);

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    try {
      localStorage.setItem(TAB_KEY, newTab);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <Compass className="h-7 w-7 text-[#2563EB]" />
        <h1 className="text-2xl font-bold text-foreground">Discover</h1>
      </div>

      {/* Tab toggle + view toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["movies", "tv"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {t === "movies" ? "Movies" : "TV Shows"}
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

      {tab === "movies" ? (
        <>
          <DiscoverRow
            title="Trending This Week"
            items={trendingMovies}
            initialLibraryMap={libraryMap}
            viewMode={view}
          />
          <DiscoverRow
            title="Now Playing in Theaters"
            items={nowPlaying}
            initialLibraryMap={libraryMap}
            viewMode={view}
          />
          <DiscoverRow
            title="Popular"
            items={popularMovies}
            initialLibraryMap={libraryMap}
            viewMode={view}
          />
          <DiscoverRow
            title="Top Rated"
            items={topRatedMovies}
            initialLibraryMap={libraryMap}
            viewMode={view}
          />
        </>
      ) : (
        <>
          <DiscoverRow
            title="Trending This Week"
            items={trendingTv}
            initialLibraryMap={libraryMap}
            viewMode={view}
          />
          <DiscoverRow
            title="Currently Airing"
            items={onTheAir}
            initialLibraryMap={libraryMap}
            viewMode={view}
          />
          <DiscoverRow
            title="Popular"
            items={popularTv}
            initialLibraryMap={libraryMap}
            viewMode={view}
          />
          <DiscoverRow
            title="Top Rated"
            items={topRatedTv}
            initialLibraryMap={libraryMap}
            viewMode={view}
          />
        </>
      )}
    </div>
  );
}
