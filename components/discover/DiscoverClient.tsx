"use client";

import { useState, useEffect } from "react";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiscoverRow, type DiscoverItem } from "./DiscoverRow";

const TAB_KEY = "batchflix_discover_tab";

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

      {/* Tab toggle */}
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

      {tab === "movies" ? (
        <>
          <DiscoverRow
            title="Trending This Week"
            items={trendingMovies}
            initialLibraryMap={libraryMap}
          />
          <DiscoverRow
            title="Now Playing in Theaters"
            items={nowPlaying}
            initialLibraryMap={libraryMap}
          />
          <DiscoverRow
            title="Popular"
            items={popularMovies}
            initialLibraryMap={libraryMap}
          />
          <DiscoverRow
            title="Top Rated"
            items={topRatedMovies}
            initialLibraryMap={libraryMap}
          />
        </>
      ) : (
        <>
          <DiscoverRow
            title="Trending This Week"
            items={trendingTv}
            initialLibraryMap={libraryMap}
          />
          <DiscoverRow
            title="Currently Airing"
            items={onTheAir}
            initialLibraryMap={libraryMap}
          />
          <DiscoverRow
            title="Popular"
            items={popularTv}
            initialLibraryMap={libraryMap}
          />
          <DiscoverRow
            title="Top Rated"
            items={topRatedTv}
            initialLibraryMap={libraryMap}
          />
        </>
      )}
    </div>
  );
}
