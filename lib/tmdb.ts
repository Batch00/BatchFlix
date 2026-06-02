export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TMDBExternalIds {
  imdb_id: string | null;
  facebook_id: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
}

export interface TMDBProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TMDBWatchProvidersRegion {
  link: string;
  flatrate?: TMDBProvider[];
  rent?: TMDBProvider[];
  buy?: TMDBProvider[];
  ads?: TMDBProvider[];
}

export interface TMDBWatchProviders {
  id: number;
  results: Record<string, TMDBWatchProvidersRegion>;
}

export interface TMDBProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface KeyCrew {
  director: string | null;
  writers: string[];
  cinematographer: string | null;
  composer: string | null;
  producers: string[];
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
  homepage: string;
  production_companies: TMDBProductionCompany[];
}

export interface TMDBMovieDetail extends TMDBMovie {
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  credits: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
  videos?: { results: TMDBVideo[] };
  external_ids?: TMDBExternalIds;
  "watch/providers"?: TMDBWatchProviders;
  recommendations?: { results: TMDBSearchResult[] };
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
  homepage: string;
  production_companies: TMDBProductionCompany[];
}

export interface TMDBTVDetail extends TMDBTVShow {
  created_by: Array<{ id: number; name: string; profile_path: string | null }>;
  credits: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
  videos?: { results: TMDBVideo[] };
  external_ids?: TMDBExternalIds;
  "watch/providers"?: TMDBWatchProviders;
  recommendations?: { results: TMDBSearchResult[] };
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

export interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
}

export interface TMDBPersonCredit {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv";
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  character?: string;
  job?: string;
  vote_average: number;
}

export interface TMDBCollectionPart {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
}

export interface TMDBCollection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TMDBCollectionPart[];
}

export interface TMDBSearchMultiResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  genre_ids: number[];
  vote_average: number;
}

export function getKeyCrew(crew: TMDBCrewMember[]): KeyCrew {
  const director = crew.find((c) => c.job === "Director")?.name ?? null;
  const writers = crew
    .filter((c) => ["Writer", "Screenplay", "Story"].includes(c.job))
    .slice(0, 3)
    .map((c) => c.name);
  const cinematographer =
    crew.find((c) => c.job === "Director of Photography")?.name ?? null;
  const composer =
    crew.find((c) => c.job === "Original Music Composer")?.name ?? null;
  const producers = crew
    .filter((c) => ["Producer", "Executive Producer"].includes(c.job))
    .slice(0, 2)
    .map((c) => c.name);
  return { director, writers, cinematographer, composer, producers };
}

export type NormalizedMediaItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: TMDBGenre[];
  overview: string | null;
  director: string | null;
};

export function normalizeMediaItem(
  detail: TMDBMovieDetail | TMDBTVDetail,
  mediaType: "movie" | "tv"
): NormalizedMediaItem {
  if (mediaType === "movie") {
    const m = detail as TMDBMovieDetail;
    return {
      tmdb_id: m.id,
      media_type: "movie",
      title: m.title,
      poster_path: m.poster_path,
      backdrop_path: m.backdrop_path,
      release_date: m.release_date || null,
      runtime: m.runtime || null,
      genres: m.genres ?? [],
      overview: m.overview || null,
      director: getKeyCrew(m.credits?.crew ?? []).director,
    };
  }
  const tv = detail as TMDBTVDetail;
  return {
    tmdb_id: tv.id,
    media_type: "tv",
    title: tv.name,
    poster_path: tv.poster_path,
    backdrop_path: tv.backdrop_path,
    release_date: tv.first_air_date || null,
    runtime: tv.episode_run_time?.[0] ?? null,
    genres: tv.genres ?? [],
    overview: tv.overview || null,
    director: tv.created_by?.[0]?.name ?? null,
  };
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
