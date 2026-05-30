"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, X, Film, Tv, LayoutGrid, List } from "lucide-react";
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
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/library/StarRating";
import { useSearchContext } from "@/components/search/SearchProvider";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ListWithItems, ListItemRow } from "@/lib/queries/lists";

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
  const year = m.release_date ? new Date(m.release_date).getFullYear() : null;

  const STATUS_DOT: Record<string, string> = {
    watched: "bg-primary",
    watching: "bg-yellow-400",
    watchlist: "bg-muted-foreground",
  };

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

          {item.user_media && (
            <span
              className={cn(
                "absolute bottom-2 left-2 h-2 w-2 rounded-full ring-1 ring-black/40",
                STATUS_DOT[item.user_media.status] ?? "bg-muted-foreground"
              )}
            />
          )}

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

type ListRowItemProps = {
  item: ListItemRow;
  onRemove: (mediaId: string) => void;
};

function ListRowItem({ item, onRemove }: ListRowItemProps) {
  const m = item.media_items;
  const year = m.release_date ? new Date(m.release_date).getFullYear() : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-card/80">
      <Link
        href={`/media/${m.media_type}/${m.tmdb_id}`}
        className="relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded"
      >
        {m.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
            alt={m.title}
            fill
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

      <Link href={`/media/${m.media_type}/${m.tmdb_id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {year && <span className="text-xs text-muted-foreground">{year}</span>}
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
        onClick={() => onRemove(item.media_id)}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
  const [view, setView] = useState<"grid" | "list">("list");

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_PREF_KEY);
    if (stored === "grid" || stored === "list") {
      setView(stored);
    }
  }, []);

  function handleViewChange(newView: "grid" | "list") {
    setView(newView);
    localStorage.setItem(VIEW_PREF_KEY, newView);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      try {
        await fetch(`/api/lists/${list.id}/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: newItems.map((item, index) => ({
              id: item.id,
              position: index,
            })),
          }),
        });
      } catch {
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
        toast.success("Removed from list");
        router.refresh();
      } catch {
        setItems(prev);
        toast.error("Failed to remove item");
      }
    },
    [items, list.id, router]
  );

  const isFavorites = list.name === "Favorites";
  const colorClass = COLOR_BG[list.color] ?? "bg-blue-600";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            href="/lists"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Lists
          </Link>
          <div className="mt-1 flex items-center gap-2.5">
            {!isFavorites && (
              <span
                className={cn("h-3 w-3 flex-shrink-0 rounded-full", colorClass)}
              />
            )}
            <h1 className="text-3xl font-bold text-foreground">{list.name}</h1>
          </div>
          {list.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {list.description}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              onClick={() => handleViewChange("grid")}
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
              onClick={() => handleViewChange("list")}
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

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Film className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold text-foreground">
            This list is empty
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Add items by searching or from any media page.
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
      ) : view === "grid" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
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
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <ListRowItem key={item.id} item={item} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
