import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  mediaId: z.string().uuid(),
  seasonNumber: z.number().int().positive(),
  episodes: z.array(z.number().int().positive()),
  watched: z.boolean(),
  watchedDate: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { mediaId, seasonNumber, episodes, watched, watchedDate } = parsed.data;
  const now = new Date().toISOString();

  const rows = episodes.map((ep) => ({
    user_id: user.id,
    media_id: mediaId,
    season_number: seasonNumber,
    episode_number: ep,
    watched,
    watched_date: watchedDate ?? null,
    updated_at: now,
  }));

  const { error } = await supabase
    .schema("batchflix")
    .from("tv_progress")
    .upsert(rows, { onConflict: "user_id,media_id,season_number,episode_number" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-update show status based on tracked progress only.
  // Never compare against media_items.total_episodes -- new TMDB episodes shouldn't
  // affect status until the user interacts with them.
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
      // All tracked episodes watched -- safe to set watched
      newStatus = "watched";
    } else if (currentStatus !== "watched") {
      // Only update non-watched shows; never auto-downgrade a watched show
      newStatus = watchedCount > 0 ? "watching" : "watchlist";
    }
    // currentStatus === "watched" with unfinished tracked episodes: skip, no downgrade

    if (newStatus !== null && newStatus !== currentStatus) {
      await supabase
        .schema("batchflix")
        .from("user_media")
        .update({ status: newStatus, updated_at: now })
        .eq("user_id", user.id)
        .eq("media_id", mediaId);
    }
  }

  return NextResponse.json({ ok: true });
}
