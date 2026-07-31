import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DiscoverClient } from "@/components/discover/DiscoverClient";
import type { DiscoverItem } from "@/components/discover/DiscoverRow";

export const metadata: Metadata = { title: "Discover" };

type TMDBPageResult = {
  results?: Array<{
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
  }>;
};

async function fetchTMDB(path: string): Promise<TMDBPageResult> {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
    // Trending and discover rows shift at most daily
    next: { revalidate: 1800 },
  });
  if (!res.ok) return { results: [] };
  return res.json();
}

function toDiscoverItems(
  data: TMDBPageResult,
  mediaType: "movie" | "tv"
): DiscoverItem[] {
  return (data.results ?? []).slice(0, 20).map((item) => ({
    id: item.id,
    title: item.title,
    name: item.name,
    poster_path: item.poster_path,
    media_type: mediaType,
    release_date: item.release_date,
    first_air_date: item.first_air_date,
  }));
}

type LibMapRow = {
  status: string;
  media_items: { tmdb_id: number; media_type: string } | null;
};

export default async function DiscoverPage() {
  const [
    trendingMoviesData,
    trendingTvData,
    popularMoviesData,
    popularTvData,
    topRatedMoviesData,
    topRatedTvData,
    nowPlayingData,
    onTheAirData,
    supabase,
  ] = await Promise.all([
    fetchTMDB("/trending/movie/week"),
    fetchTMDB("/trending/tv/week"),
    fetchTMDB("/movie/popular"),
    fetchTMDB("/tv/popular"),
    fetchTMDB("/movie/top_rated"),
    fetchTMDB("/tv/top_rated"),
    fetchTMDB("/movie/now_playing"),
    fetchTMDB("/tv/on_the_air"),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const libraryMap: Record<string, string> = {};
  if (user) {
    const { data: libRows } = await supabase
      .schema("batchflix")
      .from("user_media")
      .select("status, media_items(tmdb_id, media_type)")
      .eq("user_id", user.id);

    for (const row of (libRows ?? []) as unknown as LibMapRow[]) {
      const mi = row.media_items;
      if (mi) {
        libraryMap[`${mi.tmdb_id}-${mi.media_type}`] = row.status;
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 md:px-6">
      <DiscoverClient
        trendingMovies={toDiscoverItems(trendingMoviesData, "movie")}
        nowPlaying={toDiscoverItems(nowPlayingData, "movie")}
        popularMovies={toDiscoverItems(popularMoviesData, "movie")}
        topRatedMovies={toDiscoverItems(topRatedMoviesData, "movie")}
        trendingTv={toDiscoverItems(trendingTvData, "tv")}
        onTheAir={toDiscoverItems(onTheAirData, "tv")}
        popularTv={toDiscoverItems(popularTvData, "tv")}
        topRatedTv={toDiscoverItems(topRatedTvData, "tv")}
        libraryMap={libraryMap}
      />
    </div>
  );
}
