import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMediaItem } from "@/lib/tmdb";
import type { TMDBMovieDetail, TMDBTVDetail } from "@/lib/tmdb";

type Params = Promise<{ id: string }>;

const addSchema = z
  .object({
    mediaId: z.string().uuid().optional(),
    tmdbId: z.number().int().positive().optional(),
    mediaType: z.enum(["movie", "tv"]).optional(),
  })
  .refine(
    (d) => d.mediaId || (d.tmdbId && d.mediaType),
    "Either mediaId or (tmdbId + mediaType) is required"
  );

const removeSchema = z.object({ mediaId: z.string().uuid() });

async function resolveMediaId(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<string | null> {
  const { data: existing } = await supabase
    .schema("batchflix")
    .from("media_items")
    .select("id")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (existing) return existing.id as string;

  const tmdbUrl =
    mediaType === "movie"
      ? `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits`
      : `https://api.themoviedb.org/3/tv/${tmdbId}?append_to_response=credits`;

  const tmdbRes = await fetch(tmdbUrl, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}`,
    },
    next: { revalidate: 3600 },
  });

  if (!tmdbRes.ok) return null;

  const tmdbData = (await tmdbRes.json()) as TMDBMovieDetail | TMDBTVDetail;
  const normalized = normalizeMediaItem(tmdbData, mediaType);

  const admin = createAdminClient();
  const { data: mediaItem } = await admin
    .schema("batchflix")
    .from("media_items")
    .upsert(normalized, { onConflict: "tmdb_id,media_type" })
    .select("id")
    .single();

  return mediaItem?.id ?? null;
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: list } = await supabase
    .schema("batchflix")
    .from("lists")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let resolvedMediaId: string | null = parsed.data.mediaId ?? null;

  if (!resolvedMediaId && parsed.data.tmdbId && parsed.data.mediaType) {
    resolvedMediaId = await resolveMediaId(
      supabase,
      parsed.data.tmdbId,
      parsed.data.mediaType
    );
  }

  if (!resolvedMediaId) {
    return NextResponse.json({ error: "Could not resolve media item" }, { status: 422 });
  }

  const { data: maxRow } = await supabase
    .schema("batchflix")
    .from("list_items")
    .select("position")
    .eq("list_id", id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((maxRow as { position: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .schema("batchflix")
    .from("list_items")
    .insert({ list_id: id, media_id: resolvedMediaId, position })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already in list" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: list } = await supabase
    .schema("batchflix")
    .from("lists")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase
    .schema("batchflix")
    .from("list_items")
    .delete()
    .eq("list_id", id)
    .eq("media_id", parsed.data.mediaId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
