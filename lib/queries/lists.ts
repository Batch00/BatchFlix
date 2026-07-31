import type { SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_ITEM_CARD_COLUMNS } from "./library";
import type { MediaItemRow } from "./library";

export type ListRule = {
  type: string;
  status?: string;
};

export type ListRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  is_pinned: boolean;
  rules: ListRule[];
  parent_list_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SublistSummary = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  item_count: number;
  is_pinned: boolean;
  rules: ListRule[];
};

export type ListWithCount = ListRow & {
  item_count: number;
  sublists?: ListWithCount[];
};

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

export type ListWithItems = ListRow & {
  list_items: ListItemRow[];
  parent?: { id: string; name: string; color: string } | null;
  sublists?: SublistSummary[];
};

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

  const allLists = ((data ?? []) as Array<Record<string, unknown>>).map(
    (row) => ({
      ...(row as ListRow),
      rules: (row.rules as ListRule[] | null) ?? [],
      parent_list_id: (row.parent_list_id as string | null) ?? null,
      item_count:
        (row.list_items as Array<{ count: number }>)?.[0]?.count ?? 0,
    })
  ) as ListWithCount[];

  // Separate top-level lists from sublists
  const sublistsByParent = new Map<string, ListWithCount[]>();
  const topLevel: ListWithCount[] = [];

  for (const list of allLists) {
    if (list.parent_list_id) {
      const siblings = sublistsByParent.get(list.parent_list_id) ?? [];
      siblings.push(list);
      sublistsByParent.set(list.parent_list_id, siblings);
    } else {
      topLevel.push(list);
    }
  }

  const HIDDEN = new Set(["Favorite Movies", "Favorite TV Shows"]);

  // Attach sublists to parents and aggregate item counts
  return topLevel
    .filter((parent) => !HIDDEN.has(parent.name))
    .map((parent) => {
    const sublists = sublistsByParent.get(parent.id) ?? [];
    const sublistTotal = sublists.reduce((sum, s) => sum + s.item_count, 0);
    return {
      ...parent,
      item_count: parent.item_count + sublistTotal,
      sublists,
    };
  });
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
        media_items (${MEDIA_ITEM_CARD_COLUMNS})
      )
    `
    )
    .eq("id", listId)
    .eq("user_id", userId)
    .order("position", { referencedTable: "list_items", ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!list) return null;

  const listRecord = list as Record<string, unknown>;
  const parentListId = (listRecord.parent_list_id as string | null) ?? null;

  const items = (listRecord.list_items ?? []) as Array<Record<string, unknown>>;
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

  // Fetch parent info (for sublist breadcrumb) or sublists (for parent view)
  let parent: { id: string; name: string; color: string } | null = null;
  let sublists: SublistSummary[] = [];

  if (parentListId) {
    const { data: parentData } = await supabase
      .schema("batchflix")
      .from("lists")
      .select("id, name, color")
      .eq("id", parentListId)
      .eq("user_id", userId)
      .maybeSingle();
    parent = (parentData as { id: string; name: string; color: string } | null) ?? null;
  } else {
    const { data: sublistData } = await supabase
      .schema("batchflix")
      .from("lists")
      .select("id, name, color, description, is_pinned, rules, list_items(count)")
      .eq("parent_list_id", listId)
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    sublists = ((sublistData ?? []) as Array<Record<string, unknown>>).map(
      (s) => ({
        id: s.id as string,
        name: s.name as string,
        color: s.color as string,
        description: (s.description as string | null) ?? null,
        item_count:
          (s.list_items as Array<{ count: number }>)?.[0]?.count ?? 0,
        is_pinned: (s.is_pinned as boolean) ?? false,
        rules: (s.rules as ListRule[] | null) ?? [],
      })
    );
  }

  return {
    ...(list as ListRow),
    rules: (listRecord.rules as ListRule[] | null) ?? [],
    parent_list_id: parentListId,
    list_items: items.map((item) => ({
      ...(item as Omit<ListItemRow, "user_media">),
      user_media: userMediaMap.get(item.media_id as string) ?? null,
    })),
    parent,
    sublists,
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

export async function getFavoritesListIds(
  supabase: SupabaseClient,
  userId: string
): Promise<{ movies: string | null; tv: string | null }> {
  const { data } = await supabase
    .schema("batchflix")
    .from("lists")
    .select("id, name")
    .eq("user_id", userId)
    .in("name", ["Favorite Movies", "Favorite TV Shows"]);

  const rows = (data ?? []) as Array<{ id: string; name: string }>;
  return {
    movies: rows.find((r) => r.name === "Favorite Movies")?.id ?? null,
    tv: rows.find((r) => r.name === "Favorite TV Shows")?.id ?? null,
  };
}
