"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Tv, Heart, GripVertical, Plus } from "lucide-react";
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
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StarRating } from "@/components/library/StarRating";
import { useSearchContext } from "@/components/search/SearchProvider";
import { toast } from "@/lib/toast";
import { handleDemoResponse } from "@/lib/demo";
import { cn } from "@/lib/utils";
import type { ListItemRow } from "@/lib/queries/lists";

const RANK_STYLES: Record<number, { text: string; size: string; border: string }> = {
  1: { text: "text-yellow-400", size: "text-2xl md:text-3xl", border: "border-l-2 border-yellow-400" },
  2: { text: "text-zinc-400", size: "text-xl md:text-2xl", border: "border-l-2 border-zinc-400" },
  3: { text: "text-amber-600", size: "text-lg md:text-xl", border: "border-l-2 border-amber-600" },
};

type RowProps = {
  item: ListItemRow;
  rank: number;
  listId: string;
  onRemove: (item: ListItemRow) => void;
};

function SortableRankingRow({ item, rank, listId, onRemove }: RowProps) {
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
  const rankStyle = RANK_STYLES[rank] ?? { text: "text-[#71717a]", size: "text-base md:text-lg", border: "" };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        "group flex items-start gap-3 border-b border-[#1f1f1f] bg-[#111111] px-3 py-2.5 hover:bg-[#1a1a1a]",
        rankStyle.border
      )}
      {...attributes}
    >
      {/* Rank */}
      <div
        className={cn(
          "mt-1 w-9 flex-shrink-0 text-right font-mono font-bold leading-none",
          rankStyle.text,
          rankStyle.size
        )}
      >
        {rank}
      </div>

      {/* Poster */}
      <Link
        href={`/media/${m.media_type}/${m.tmdb_id}`}
        className="relative h-[72px] w-12 flex-shrink-0 overflow-hidden rounded-md"
        onClick={(e) => { if (isDragging) e.preventDefault(); }}
      >
        {m.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
            alt={m.title}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            {m.media_type === "movie" ? (
              <Film className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Tv className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </Link>

      {/* Info */}
      <Link
        href={`/media/${m.media_type}/${m.tmdb_id}`}
        className="min-w-0 flex-1"
        onClick={(e) => { if (isDragging) e.preventDefault(); }}
      >
        <p className="break-words text-base font-semibold text-foreground">{m.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {year && <span className="text-sm text-muted-foreground">{year}</span>}
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
            {m.media_type === "movie" ? "Movie" : "TV"}
          </span>
        </div>
        {item.user_media?.rating && item.user_media.rating > 0 && (
          <div className="mt-1">
            <StarRating rating={item.user_media.rating} size={12} />
          </div>
        )}
      </Link>

      {/* Remove from favorites */}
      <button
        type="button"
        aria-label="Remove from favorites"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item);
        }}
        className="flex-shrink-0 rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-500/10"
      >
        <Heart className="h-4 w-4 fill-red-500" />
      </button>

      {/* Drag handle */}
      <div
        className="flex-shrink-0 cursor-grab touch-none p-2 text-muted-foreground opacity-100 transition-opacity hover:text-foreground active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100"
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>
    </div>
  );
}

type Props = {
  initialItems: ListItemRow[];
  listId: string;
  mediaType: "movie" | "tv";
  listName: string;
};

export function RankingList({ initialItems, listId, mediaType, listName }: Props) {
  const router = useRouter();
  const { openForFavorites } = useSearchContext();
  const [items, setItems] = useState<ListItemRow[]>(initialItems);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
        const res = await fetch(`/api/lists/${listId}/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: newItems.map((item, index) => ({ id: item.id, position: index })),
          }),
        });
        if (handleDemoResponse(res)) {
          setItems(items); // revert optimistic update
          return;
        }
      } catch {
        toast.error("Failed to save order");
      }
    },
    [items, listId]
  );

  const handleRemove = useCallback(
    async (item: ListItemRow) => {
      const prev = items;
      const userMediaId = item.user_media?.id;
      const mediaId = item.media_id;
      setItems((cur) => cur.filter((i) => i.id !== item.id));

      try {
        const responses = await Promise.all([
          userMediaId
            ? fetch("/api/library/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userMediaId, isFavorite: false }),
              })
            : Promise.resolve(new Response(null, { status: 200 })),
          fetch(`/api/lists/${listId}/items`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaId }),
          }),
        ]);
        if (responses.some((r) => handleDemoResponse(r))) {
          setItems(prev);
          return;
        }

        toast("Removed from favorites", {
          action: {
            label: "Undo",
            onClick: () => {
              void (async () => {
                try {
                  const undoPromises: Promise<Response>[] = [];
                  if (userMediaId) {
                    undoPromises.push(
                      fetch("/api/library/update", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userMediaId, isFavorite: true }),
                      })
                    );
                  }
                  undoPromises.push(
                    fetch(`/api/lists/${listId}/items`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ mediaId }),
                    })
                  );
                  await Promise.all(undoPromises);
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
        toast.error("Failed to remove from favorites");
      }
    },
    [items, listId, router]
  );

  if (items.length === 0) {
    const EmptyIcon = mediaType === "movie" ? Film : Tv;
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <EmptyIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">No favorites yet</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {mediaType === "movie"
            ? "Add movies you love to build your rankings."
            : "Add TV shows you love to build your rankings."}
        </p>
        {listId && (
          <button
            type="button"
            onClick={() => openForFavorites(listId, mediaType, listName)}
            className="mt-4 flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add your first
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="overflow-hidden rounded-lg border border-[#1f1f1f]">
            {items.map((item, index) => (
              <SortableRankingRow
                key={item.id}
                item={item}
                rank={index + 1}
                listId={listId}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {listId && (
        <button
          type="button"
          onClick={() => openForFavorites(listId, mediaType, listName)}
          className="mt-3 flex items-center gap-1.5 self-start rounded-md border border-dashed border-[#1f1f1f] px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          {mediaType === "movie" ? "Add Movie" : "Add TV Show"}
        </button>
      )}
    </div>
  );
}
