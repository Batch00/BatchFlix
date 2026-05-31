import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMediaItem } from "@/lib/tmdb";
import type { TMDBMovieDetail, TMDBTVDetail } from "@/lib/tmdb";

const schema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  listId: z.string().uuid(),
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

  const { tmdbId, mediaType, listId } = parsed.data;

  // Verify list belongs to user
  const { data: list } = await supabase
    .schema("batchflix")
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Fetch TMDB data and upsert media_items
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

  const mediaId = (mediaItem as Record<string, unknown>).id as string;

  // Check if user_media already exists — don't overwrite existing status/rating
  const { data: existingMedia } = await supabase
    .schema("batchflix")
    .from("user_media")
    .select("id, is_favorite")
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .maybeSingle();

  if (existingMedia) {
    const em = existingMedia as Record<string, unknown>;
    if (!em.is_favorite) {
      await supabase
        .schema("batchflix")
        .from("user_media")
        .update({ is_favorite: true })
        .eq("id", em.id as string);
    }
  } else {
    // Add to library as watchlist, marked as favorite
    await supabase
      .schema("batchflix")
      .from("user_media")
      .insert({
        user_id: user.id,
        media_id: mediaId,
        status: "watchlist",
        is_favorite: true,
      });
  }

  // Add to favorites list (ignore duplicate)
  const { data: maxRow } = await supabase
    .schema("batchflix")
    .from("list_items")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position =
    ((maxRow as Record<string, unknown> | null)?.position as number | undefined ?? -1) + 1;

  const { error: insertError } = await supabase
    .schema("batchflix")
    .from("list_items")
    .insert({ list_id: listId, media_id: mediaId, position });

  if (insertError && insertError.code !== "23505") {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
