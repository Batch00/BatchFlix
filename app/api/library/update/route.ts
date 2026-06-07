import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { markAllEpisodesWatched } from "@/lib/tmdb-episodes";
import { isDemoUser, demoGuardResponse } from "@/lib/demo";

const schema = z.object({
  userMediaId: z.string().uuid(),
  status: z.enum(["watched", "watching", "watchlist"]).optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  watchedDate: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  isFavorite: z.boolean().optional(),
  createdAt: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoUser(user.id)) return demoGuardResponse();

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

  const { userMediaId, status, rating, watchedDate, notes, isFavorite, createdAt } =
    parsed.data;

  // Fetch current row to detect status/favorite change
  const { data: existing } = await supabase
    .schema("batchflix")
    .from("user_media")
    .select("status, media_id, is_favorite")
    .eq("id", userMediaId)
    .eq("user_id", user.id)
    .maybeSingle();

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (rating !== undefined) updates.rating = rating;
  if (watchedDate !== undefined) updates.watched_date = watchedDate;
  if (notes !== undefined) updates.notes = notes;
  if (isFavorite !== undefined) updates.is_favorite = isFavorite;
  if (createdAt !== undefined) updates.created_at = createdAt;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .schema("batchflix")
    .from("user_media")
    .update(updates)
    .eq("id", userMediaId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const removedFromLists: string[] = [];

  // Enforce auto-remove rules when status changed
  if (
    status !== undefined &&
    existing?.status !== status &&
    existing?.media_id
  ) {
    const mediaId = existing.media_id as string;

    // Find all lists containing this media item
    const { data: listItems } = await supabase
      .schema("batchflix")
      .from("list_items")
      .select("list_id, id")
      .eq("media_id", mediaId);

    if (listItems && listItems.length > 0) {
      const listIds = listItems.map((li) => li.list_id as string);

      // Fetch those lists including parent_list_id for cascade check
      const { data: lists } = await supabase
        .schema("batchflix")
        .from("lists")
        .select("id, rules, parent_list_id")
        .eq("user_id", user.id)
        .in("id", listIds);

      if (lists) {
        // Collect unique parent IDs to fetch parent rules in one query
        const parentIds = [
          ...new Set(
            lists
              .map((l) => (l as Record<string, unknown>).parent_list_id as string | null)
              .filter(Boolean) as string[]
          ),
        ];

        let parentRulesMap = new Map<string, Array<{ type: string; status?: string }>>();
        if (parentIds.length > 0) {
          const { data: parentLists } = await supabase
            .schema("batchflix")
            .from("lists")
            .select("id, rules")
            .eq("user_id", user.id)
            .in("id", parentIds);

          parentRulesMap = new Map(
            (parentLists ?? []).map((p) => [
              p.id as string,
              (p.rules as Array<{ type: string; status?: string }> | null) ?? [],
            ])
          );
        }

        for (const list of lists) {
          const lr = list as Record<string, unknown>;
          const rules = (lr.rules as Array<{ type: string; status?: string }> | null) ?? [];
          const parentListId = lr.parent_list_id as string | null;

          // Check own rules
          let matches = rules.some(
            (r) => r.type === "auto_remove_on_status" && r.status === status
          );

          // If no own match, check parent rules (cascade)
          if (!matches && parentListId) {
            const parentRules = parentRulesMap.get(parentListId) ?? [];
            matches = parentRules.some(
              (r) => r.type === "auto_remove_on_status" && r.status === status
            );
          }

          if (matches) {
            await supabase
              .schema("batchflix")
              .from("list_items")
              .delete()
              .eq("list_id", lr.id as string)
              .eq("media_id", mediaId);
            removedFromLists.push(lr.id as string);
          }
        }
      }
    }
  }

  // Sync favorites list when is_favorite changes
  const prevFavorite = (existing as Record<string, unknown> | null)?.is_favorite as boolean | undefined;
  if (
    isFavorite !== undefined &&
    isFavorite !== prevFavorite &&
    existing?.media_id
  ) {
    const mediaId = existing.media_id as string;

    const { data: mediaItemRow } = await supabase
      .schema("batchflix")
      .from("media_items")
      .select("media_type")
      .eq("id", mediaId)
      .maybeSingle();

    if (mediaItemRow) {
      const listName =
        (mediaItemRow as Record<string, unknown>).media_type === "movie"
          ? "Favorite Movies"
          : "Favorite TV Shows";

      const { data: favList } = await supabase
        .schema("batchflix")
        .from("lists")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", listName)
        .maybeSingle();

      if (favList) {
        const favListId = (favList as Record<string, unknown>).id as string;
        if (isFavorite) {
          const { data: maxRow } = await supabase
            .schema("batchflix")
            .from("list_items")
            .select("position")
            .eq("list_id", favListId)
            .order("position", { ascending: false })
            .limit(1)
            .maybeSingle();
          const position =
            ((maxRow as Record<string, unknown> | null)?.position as number | undefined ?? -1) + 1;

          const { error: favInsertError } = await supabase
            .schema("batchflix")
            .from("list_items")
            .insert({ list_id: favListId, media_id: mediaId, position });
          // Ignore 23505 (already in list)
          if (favInsertError && favInsertError.code !== "23505") {
            // non-fatal, continue
          }
        } else {
          await supabase
            .schema("batchflix")
            .from("list_items")
            .delete()
            .eq("list_id", favListId)
            .eq("media_id", mediaId);
        }
      }
    }
  }

  // When a TV show transitions to watched for the first time, auto-mark all episodes watched.
  // Guard against re-triggering when show is already watched (e.g. user re-saves rating).
  if (status === "watched" && existing?.status !== "watched" && existing?.media_id) {
    const { data: tvMediaItem } = await supabase
      .schema("batchflix")
      .from("media_items")
      .select("tmdb_id, media_type")
      .eq("id", existing.media_id as string)
      .maybeSingle();

    const mi = tvMediaItem as { tmdb_id: number; media_type: string } | null;
    if (mi?.media_type === "tv") {
      const wDate = typeof watchedDate === "string" ? watchedDate : null;
      await markAllEpisodesWatched(user.id, existing.media_id as string, mi.tmdb_id, wDate);
    }
  }

  return NextResponse.json({ ...data, removedFromLists });
}
