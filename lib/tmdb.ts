export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  genres: TMDBGenre[];
  vote_average: number;
  vote_count: number;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  episode_run_time: number[];
  genres: TMDBGenre[];
  vote_average: number;
  vote_count: number;
  number_of_seasons: number;
  number_of_episodes: number;
}

export interface TMDBSearchResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

export async function tmdbFetch<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const queryString = params
    ? "?" + new URLSearchParams(params).toString()
    : "";

  if (typeof window === "undefined") {
    const url = `https://api.themoviedb.org/3${path}${queryString}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`TMDB error ${res.status}: ${path}`);
    return res.json();
  }

  const url = `/api/tmdb${path}${queryString}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB proxy error ${res.status}: ${path}`);
  return res.json();
}
