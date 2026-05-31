import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaItemRow } from "./library";

export type ListRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type ListWithCount = ListRow & { item_count: number };

export type ListItemUserMedia = {
  id: string;
  status: "watched" | "watching" | "watchlist";
  rating: number | null;
  is_favorite: boolean;
};

export type ListItemRow = {
  id: string;
  list_id: string;
  media_id: string;
  position: number;
  added_at: string;
  media_items: MediaItemRow;
  user_media: ListItemUserMedia | null;
};

export type ListWithItems = ListRow & { list_items: ListItemRow[] };

export async function getUserLists(
  supabase: SupabaseClient,
  userId: string
): Promise<ListWithCount[]> {
  const { data, error } = await supabase
    .schema("batchflix")
    .from("lists")
    .select("*, list_items(count)")
    .eq("user_id", userId)
    .order("is_pinned", { ascending: false })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...(row as ListRow),
    item_count:
      (row.list_items as Array<{ count: number }>)?.[0]?.count ?? 0,
  }));
}

export async function getListById(
  supabase: SupabaseClient,
  listId: string,
  userId: string
): Promise<ListWithItems | null> {
  const { data: list, error } = await supabase
    .schema("batchflix")
    .from("lists")
    .select(
      `
      *,
      list_items (
        id,
        media_id,
        position,
        added_at,
        media_items (*)
      )
    `
    )
    .eq("id", listId)
    .eq("user_id", userId)
    .order("position", { referencedTable: "list_items", ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!list) return null;

  const items = ((list as Record<string, unknown>).list_items ?? []) as Array<
    Record<string, unknown>
  >;
  const mediaIds = items.map((item) => item.media_id as string);

  let userMediaMap = new Map<string, ListItemUserMedia>();

  if (mediaIds.length > 0) {
    const { data: userMediaData } = await supabase
      .schema("batchflix")
      .from("user_media")
      .select("id, media_id, status, rating, is_favorite")
      .eq("user_id", userId)
      .in("media_id", mediaIds);

    userMediaMap = new Map(
      (userMediaData ?? []).map((um) => [
        um.media_id as string,
        um as ListItemUserMedia,
      ])
    );
  }

  return {
    ...(list as ListRow),
    list_items: items.map((item) => ({
      ...(item as Omit<ListItemRow, "user_media">),
      user_media: userMediaMap.get(item.media_id as string) ?? null,
    })),
  } as ListWithItems;
}

export async function getListItemCount(
  supabase: SupabaseClient,
  listId: string
): Promise<number> {
  const { count, error } = await supabase
    .schema("batchflix")
    .from("list_items")
    .select("*", { count: "exact", head: true })
    .eq("list_id", listId);

  if (error) throw error;
  return count ?? 0;
}

export async function getFavoritesListId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .schema("batchflix")
    .from("lists")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Favorites")
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
