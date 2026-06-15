"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Film,
  Tv,
  LayoutGrid,
  List,
  GripVertical,
  Layers,
  Pencil,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/library/StarRating";
import { useSearchContext } from "@/components/search/SearchProvider";
import { CreateListDialog } from "./CreateListDialog";
import { EditListDialog } from "./EditListDialog";
import { toast } from "@/lib/toast";
import { usePersistedState } from "@/hooks/usePersistedState";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ListWithItems, ListItemRow, SublistSummary } from "@/lib/queries/lists";

const VIEW_PREF_KEY = "batchflix_view_preference";

const COLOR_BG: Record<string, string> = {
  "#2563EB": "bg-blue-600",
  "#7c3aed": "bg-violet-600",
  "#db2777": "bg-pink-600",
  "#dc2626": "bg-red-600",
  "#ea580c": "bg-orange-600",
  "#ca8a04": "bg-yellow-600",
  "#16a34a": "bg-green-600",
  "#0891b2": "bg-cyan-600",
};

const STATUS_BADGE: Record<string, string> = {
  watched: "bg-primary/20 text-primary border-primary/30",
  watching: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  watchlist: "bg-secondary text-muted-foreground border-border",
};

type SortableItemProps = {
  item: ListItemRow;
  listId: string;
  onRemove: (mediaId: string) => void;
};

const GRID_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  watched: { bg: "bg-blue-900/80", text: "text-blue-200", label: "Watched" },
  watching: { bg: "bg-yellow-900/80", text: "text-yellow-200", label: "Watching" },
  watchlist: { bg: "bg-zinc-800/80", text: "text-zinc-300", label: "Watchlist" },
};

function SortableItem({ item, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const m = item.media_items;
  const year = m.release_date ? +m.release_date.slice(0, 4) : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group relative cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <Link
        href={`/media/${m.media_type}/${m.tmdb_id}`}
        className="block overflow-hidden rounded-lg border border-border bg-card transition-transform duration-150 hover:scale-[1.02]"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {m.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
              alt={m.title}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              {m.media_type === "movie" ? (
                <Film className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Tv className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          )}

          {item.user_media && (() => {
            const cfg = GRID_STATUS_BADGE[item.user_media.status] ?? GRID_STATUS_BADGE.watchlist;
            return (
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 rounded-b-lg py-0.5 text-center text-[10px] font-medium",
                  cfg.bg,
                  cfg.text
                )}
              >
                {cfg.label}
              </div>
            );
          })()}

          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <p className="line-clamp-2 text-xs font-medium text-white">
              {m.title}
            </p>
            {year && <p className="mt-0.5 text-xs text-white/70">{year}</p>}
          </div>
        </div>
      </Link>

      <button
        type="button"
        aria-label="Remove from list"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item.media_id);
        }}
        className="absolute right-1 top-1 hidden rounded-full bg-black/70 p-1 text-white transition-opacity hover:bg-black group-hover:flex"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

type SortableListRowItemProps = {
  item: ListItemRow;
  onRemove: (mediaId: string) => void;
};

function SortableListRowItem({ item, onRemove }: SortableListRowItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const m = item.media_items;
  const year = m.release_date ? +m.release_date.slice(0, 4) : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-card/80"
    >
      <div
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 flex-shrink-0" />
      </div>

      <Link
        href={`/media/${m.media_type}/${m.tmdb_id}`}
        className="relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        {m.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
            alt={m.title}
            fill
            unoptimized
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            {m.media_type === "movie" ? (
              <Film className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Tv className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        )}
      </Link>

      <Link
        href={`/media/${m.media_type}/${m.tmdb_id}`}
        className="min-w-0 flex-1"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        <p className="truncate text-sm font-medium text-foreground">
          {m.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {year && (
            <span className="text-xs text-muted-foreground">{year}</span>
          )}
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
            {m.media_type}
          </span>
        </div>
      </Link>

      <div className="hidden items-center gap-3 sm:flex">
        {item.user_media && (
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
              STATUS_BADGE[item.user_media.status] ?? STATUS_BADGE.watchlist
            )}
          >
            {item.user_media.status}
          </span>
        )}
        {item.user_media?.rating && item.user_media.rating > 0 ? (
          <StarRating rating={item.user_media.rating} size={14} />
        ) : (
          <div className="w-24" />
        )}
      </div>

      <button
        type="button"
        aria-label="Remove from list"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item.media_id);
        }}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}


type SortableSublistChipProps = {
  sub: SublistSummary;
  isProtected: boolean;
  onEdit: (sub: SublistSummary) => void;
  onDelete: (sub: SublistSummary) => void;
};

function SortableSublistChip({
  sub,
  isProtected,
  onEdit,
  onDelete,
}: SortableSublistChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group relative"
    >
      <Link
        href={`/lists/${sub.id}`}
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-[#1f1f1f] py-1.5 pl-2 text-sm transition-colors hover:border-[#2563EB]/40",
          isProtected ? "pr-3" : "pr-12"
        )}
      >
        <span
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          onClick={(e) => e.preventDefault()}
          className="cursor-grab touch-none text-muted-foreground/60 active:cursor-grabbing"
        >
          <GripVertical className="h-3 w-3" />
        </span>
        <span
          className={cn(
            "h-2 w-2 flex-shrink-0 rounded-full",
            COLOR_BG[sub.color] ?? "bg-blue-600"
          )}
        />
        <span className="font-medium text-foreground">{sub.name}</span>
        <span className="text-muted-foreground/70">{sub.item_count}</span>
      </Link>
      {!isProtected && (
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Edit ${sub.name}`}
            onClick={(e) => {
              e.preventDefault();
              onEdit(sub);
            }}
            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${sub.name}`}
            onClick={(e) => {
              e.preventDefault();
              onDelete(sub);
            }}
            className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

type Props = {
  list: ListWithItems;
};

export function ListDetailContent({ list }: Props) {
  const router = useRouter();
  const { openForList } = useSearchContext();
  const [items, setItems] = useState<ListItemRow[]>(list.list_items);
  const [sublists, setSublists] = useState<SublistSummary[]>(
    list.sublists ?? []
  );
  const [view, setView] = usePersistedState<"grid" | "list">(
    VIEW_PREF_KEY,
    "list"
  );
  const [createSublistOpen, setCreateSublistOpen] = useState(false);
  const [deleteSublist, setDeleteSublist] = useState<SublistSummary | null>(null);
  const [deletingSublist, setDeletingSublist] = useState(false);
  const [editSublist, setEditSublist] = useState<SublistSummary | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Keep local sublists in sync when the server re-fetches (e.g. after a
  // create/delete sublist triggers router.refresh()). Syncing during render
  // (rather than in an effect) avoids an extra render pass; the reference
  // check makes this a no-op on client-only updates like drag reordering.
  const [syncedSublists, setSyncedSublists] = useState(list.sublists);
  if (list.sublists !== syncedSublists) {
    setSyncedSublists(list.sublists);
    setSublists(list.sublists ?? []);
  }

  const handleSublistDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sublists.findIndex((s) => s.id === active.id);
      const newIndex = sublists.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const prev = sublists;
      const newSublists = arrayMove(sublists, oldIndex, newIndex);
      setSublists(newSublists);

      try {
        const res = await fetch(`/api/lists/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listIds: newSublists.map((s) => s.id) }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setSublists(prev);
        toast.error("Failed to save order");
      }
    },
    [sublists]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const prev = items;
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      const orderedItems = newItems.map((item, index) => ({
        id: item.id,
        position: index,
      }));

      try {
        const res = await fetch(`/api/lists/${list.id}/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: orderedItems }),
        });
        if (!res.ok) throw new Error(`Reorder failed: ${res.status}`);
      } catch {
        setItems(prev);
        toast.error("Failed to save order");
      }
    },
    [items, list.id]
  );

  const handleRemove = useCallback(
    async (mediaId: string) => {
      const prev = items;
      setItems((cur) => cur.filter((i) => i.media_id !== mediaId));
      try {
        const res = await fetch(`/api/lists/${list.id}/items`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId }),
        });
        if (!res.ok) throw new Error();
        toast("Removed from list", {
          action: {
            label: "Undo",
            onClick: () => {
              void (async () => {
                try {
                  await fetch(`/api/lists/${list.id}/items`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mediaId }),
                  });
                  setItems(prev);
                  toast.success("Undone");
                  router.refresh();
                } catch {
                  toast.error("Failed to undo");
                }
              })();
            },
          },
        });
        router.refresh();
      } catch {
        setItems(prev);
        toast.error("Failed to remove item");
      }
    },
    [items, list.id, router]
  );

  async function handleDeleteSublist() {
    if (!deleteSublist) return;
    setDeletingSublist(true);
    try {
      const res = await fetch(`/api/lists/${deleteSublist.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete");
      }
      toast.success("Sublist deleted");
      setDeleteSublist(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeletingSublist(false);
    }
  }

  const PROTECTED_SUBLISTS = new Set([
    "Favorites",
    "Favorite Movies",
    "Favorite TV Shows",
  ]);

  const isFavorites = list.name === "Favorites";
  const colorClass = COLOR_BG[list.color] ?? "bg-blue-600";
  const isSublist = !!list.parent_list_id;
  const hasSubl = (list.sublists?.length ?? 0) > 0;

  // Total items = direct items + sublist item counts
  const sublistTotal = (list.sublists ?? []).reduce(
    (sum, s) => sum + s.item_count,
    0
  );
  const totalCount = items.length + sublistTotal;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          {/* Breadcrumb: for sublists show parent → this; for top-level show ← Lists */}
          {isSublist && list.parent ? (
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted-foreground">
              <Link
                href="/lists"
                className="inline-flex items-center transition-colors hover:text-foreground"
              >
                Lists
              </Link>
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
              <Link
                href={`/lists/${list.parent.id}`}
                className="inline-flex items-center font-medium transition-colors hover:text-foreground"
              >
                {list.parent.name}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="inline-flex items-center font-medium text-foreground">
                {list.name}
              </span>
            </div>
          ) : (
            <Link
              href="/lists"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Lists
            </Link>
          )}

          <div className="mt-1 flex items-center gap-2.5">
            {!isFavorites && (
              <span
                className={cn("h-3 w-3 flex-shrink-0 rounded-full", colorClass)}
              />
            )}
            <h1 className="text-xl font-bold text-foreground md:text-3xl">{list.name}</h1>
            {isSublist && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                sublist
              </span>
            )}
          </div>

          {list.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {list.description}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {hasSubl ? (
              <>
                {totalCount} {totalCount === 1 ? "item" : "items"} total
                {items.length > 0 && (
                  <span className="text-muted-foreground/60">
                    {" "}
                    ({items.length} direct)
                  </span>
                )}
              </>
            ) : (
              <>
                {items.length} {items.length === 1 ? "item" : "items"}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "rounded-l-md p-2 transition-colors duration-150",
                view === "grid"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded-r-md p-2 transition-colors duration-150",
                view === "list"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="outline"
            onClick={() => openForList(list.id, list.name)}
          >
            <Plus className="h-4 w-4" />
            Add items
          </Button>
        </div>
      </div>

      {/* Sublists section (only for parent lists) */}
      {hasSubl && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Sublists
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSublistDragEnd}
          >
            <SortableContext
              items={sublists.map((s) => s.id)}
              strategy={rectSortingStrategy}
            >
              <div className="flex flex-wrap gap-2">
                {sublists.map((sub) => (
                  <SortableSublistChip
                    key={sub.id}
                    sub={sub}
                    isProtected={PROTECTED_SUBLISTS.has(sub.name)}
                    onEdit={setEditSublist}
                    onDelete={setDeleteSublist}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setCreateSublistOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-[#1f1f1f] px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-[#2563EB]/40 hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New sublist
                </button>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Direct items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Film className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold text-foreground">
            {hasSubl ? "No direct items" : "This list is empty"}
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {hasSubl
              ? "Items are in sublists. Add items directly here or browse a sublist."
              : "Add items by searching or from any media page."}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => openForList(list.id, list.name)}
          >
            <Plus className="h-4 w-4" />
            Add items
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={
              view === "grid" ? rectSortingStrategy : verticalListSortingStrategy
            }
          >
            {view === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    listId={list.id}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <SortableListRowItem
                    key={item.id}
                    item={item}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      )}

      <AlertDialog
        open={deleteSublist !== null}
        onOpenChange={(v) => { if (!v) setDeleteSublist(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteSublist?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will also remove all items in this sublist. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSublist}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteSublist}
              disabled={deletingSublist}
            >
              {deletingSublist ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create sublist dialog with this list pre-selected as parent */}
      <CreateListDialog
        open={createSublistOpen}
        onOpenChange={setCreateSublistOpen}
        topLevelLists={[{ id: list.id, name: list.name }]}
        initialParentListId={list.id}
      />

      {/* Edit sublist dialog */}
      <EditListDialog
        list={editSublist ? {
          id: editSublist.id,
          name: editSublist.name,
          description: editSublist.description,
          color: editSublist.color,
          is_pinned: editSublist.is_pinned,
          rules: editSublist.rules,
          parent_list_id: list.id,
        } : null}
        open={editSublist !== null}
        onOpenChange={(v) => { if (!v) setEditSublist(null); }}
        topLevelLists={[{ id: list.id, name: list.name }]}
        successMessage="Sublist updated"
      />
    </div>
  );
}
