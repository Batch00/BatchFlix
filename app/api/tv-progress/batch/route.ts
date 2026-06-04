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

  // Auto-update show status based on total progress
  const { data: allProgress } = await supabase
    .schema("batchflix")
    .from("tv_progress")
    .select("watched")
    .eq("user_id", user.id)
    .eq("media_id", mediaId);

  if (allProgress) {
    const watchedCount = allProgress.filter((r) => r.watched).length;

    // Get total_episodes from media_items
    const { data: mediaItem } = await supabase
      .schema("batchflix")
      .from("media_items")
      .select("total_episodes")
      .eq("id", mediaId)
      .maybeSingle();

    const total = (mediaItem as { total_episodes?: number | null } | null)?.total_episodes ?? null;

    if (watchedCount > 0) {
      const newStatus =
        total !== null && watchedCount >= total ? "watched" : "watching";

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
