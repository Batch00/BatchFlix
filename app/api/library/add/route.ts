import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMediaItem } from "@/lib/tmdb";
import type { TMDBMovieDetail, TMDBTVDetail } from "@/lib/tmdb";
import { markAllEpisodesWatched } from "@/lib/tmdb-episodes";

const schema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  status: z.enum(["watched", "watching", "watchlist"]),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  watchedDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tmdbId, mediaType, status, rating, watchedDate, notes } = parsed.data;

  const tmdbUrl =
    mediaType === "movie"
      ? `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits`
      : `https://api.themoviedb.org/3/tv/${tmdbId}?append_to_response=credits`;

  const tmdbRes = await fetch(tmdbUrl, {
    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
    next: { revalidate: 3600 },
  });

  if (!tmdbRes.ok) {
    return NextResponse.json({ error: "TMDB fetch failed" }, { status: 502 });
  }

  const tmdbData = (await tmdbRes.json()) as TMDBMovieDetail | TMDBTVDetail;
  const normalized = normalizeMediaItem(tmdbData, mediaType);

  const admin = createAdminClient();

  const { data: mediaItem, error: upsertError } = await admin
    .schema("batchflix")
    .from("media_items")
    .upsert(normalized, { onConflict: "tmdb_id,media_type" })
    .select("id")
    .single();

  if (upsertError || !mediaItem) {
    return NextResponse.json({ error: "Failed to cache media" }, { status: 500 });
  }

  function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const watched =
    status === "watched" && !watchedDate ? todayLocal() : watchedDate ?? null;

  const { data: userMedia, error: insertError } = await supabase
    .schema("batchflix")
    .from("user_media")
    .upsert(
      {
        user_id: user.id,
        media_id: mediaItem.id,
        status,
        rating: rating ?? null,
        watched_date: watched,
        notes: notes ?? null,
      },
      { onConflict: "user_id,media_id" }
    )
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // When adding a TV show as watched, auto-mark all episodes watched
  if (status === "watched" && mediaType === "tv" && mediaItem?.id) {
    await markAllEpisodesWatched(user.id, mediaItem.id, tmdbId, watched ?? null);
  }

  return NextResponse.json(userMedia, { status: 200 });
}
