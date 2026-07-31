import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoUser, demoGuardResponse } from "@/lib/demo";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mediaId = request.nextUrl.searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "mediaId required" }, { status: 400 });

  const { data, error } = await supabase
    .schema("batchflix")
    .from("tv_progress")
    .select("id, season_number, episode_number, watched, watched_date, rating")
    .eq("user_id", user.id)
    .eq("media_id", mediaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const postSchema = z.object({
  mediaId: z.string().uuid(),
  seasonNumber: z.number().int().positive(),
  episodeNumber: z.number().int().positive(),
  watched: z.boolean(),
  watchedDate: z.string().optional(),
  rating: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isDemoUser(user.id)) return demoGuardResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { mediaId, seasonNumber, episodeNumber, watched, watchedDate, rating } = parsed.data;

  const { data, error } = await supabase
    .schema("batchflix")
    .from("tv_progress")
    .upsert(
      {
        user_id: user.id,
        media_id: mediaId,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        watched,
        watched_date: watchedDate ?? null,
        rating: rating ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,media_id,season_number,episode_number" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalculate show status from tracked rows only. Comparing against tracked
  // rows (not media_items.total_episodes) means TMDB adding episodes cannot
  // shift the status on its own -- only explicit user actions land here.
  const [{ data: allProgress }, { data: currentMedia }] = await Promise.all([
    supabase
      .schema("batchflix")
      .from("tv_progress")
      .select("watched")
      .eq("user_id", user.id)
      .eq("media_id", mediaId),
    supabase
      .schema("batchflix")
      .from("user_media")
      .select("status")
      .eq("user_id", user.id)
      .eq("media_id", mediaId)
      .maybeSingle(),
  ]);

  if (allProgress && allProgress.length > 0) {
    const totalTracked = allProgress.length;
    const watchedCount = allProgress.filter((r) => r.watched).length;
    const currentStatus = (currentMedia as { status?: string } | null)?.status;

    let newStatus: string | null = null;

    if (watchedCount === totalTracked) {
      newStatus = "watched";
    } else if (watchedCount > 0) {
      newStatus = "watching";
    }
    // watchedCount === 0: leave status alone, the user may have set it deliberately

    if (newStatus !== null && newStatus !== currentStatus) {
      await supabase
        .schema("batchflix")
        .from("user_media")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("media_id", mediaId);
    }
  }

  return NextResponse.json(data);
}
