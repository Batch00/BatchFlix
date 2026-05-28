import type { SupabaseClient } from "@supabase/supabase-js";

export type MediaItemRow = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: Array<{ id: number; name: string }>;
  overview: string | null;
  director: string | null;
  created_at: string;
  updated_at: string;
};

export type UserMediaRow = {
  id: string;
  user_id: string;
  media_id: string;
  status: "watched" | "watching" | "watchlist";
  rating: number | null;
  watched_date: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  media_items: MediaItemRow;
};

type LibraryFilters = {
  status?: "watched" | "watching" | "watchlist";
  sort?: "date_added" | "watched_date" | "rating" | "title";
  limit?: number;
  offset?: number;
};

export async function getUserLibrary(
  supabase: SupabaseClient,
  userId: string,
  filters: LibraryFilters = {}
): Promise<UserMediaRow[]> {
  const { status, sort = "date_added", limit, offset } = filters;

  let query = supabase
    .schema("batchflix")
    .from("user_media")
    .select("*, media_items(*)")
    .eq("user_id", userId);

  if (status) {
    query = query.eq("status", status);
  }

  if (sort === "date_added") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "watched_date") {
    query = query.order("watched_date", { ascending: false });
  } else if (sort === "rating") {
    query = query.order("rating", { ascending: false });
  }
  // title sort handled in JS after fetch

  if (limit) query = query.limit(limit);
  if (offset) query = query.range(offset, offset + (limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as UserMediaRow[];

  if (sort === "title") {
    rows = rows.sort((a, b) =>
      a.media_items.title.localeCompare(b.media_items.title)
    );
  }

  return rows;
}

export async function getUserMediaItem(
  supabase: SupabaseClient,
  userId: string,
  mediaId: string
): Promise<UserMediaRow | null> {
  const { data, error } = await supabase
    .schema("batchflix")
    .from("user_media")
    .select("*, media_items(*)")
    .eq("user_id", userId)
    .eq("media_id", mediaId)
    .maybeSingle();

  if (error) throw error;
  return data as UserMediaRow | null;
}

export async function getUserMediaByTmdbId(
  supabase: SupabaseClient,
  userId: string,
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<UserMediaRow | null> {
  const { data: mediaItem } = await supabase
    .schema("batchflix")
    .from("media_items")
    .select("id")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (!mediaItem) return null;

  return getUserMediaItem(supabase, userId, mediaItem.id);
}
