"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, LayoutList, GripVertical } from "lucide-react";
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
import { ListCard } from "./ListCard";
import { CreateListDialog } from "./CreateListDialog";
import { EditListDialog } from "./EditListDialog";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ListWithCount } from "@/lib/queries/lists";

type SortableListCardProps = {
  list: ListWithCount;
  onEdit: (list: ListWithCount) => void;
  onDelete: (list: ListWithCount) => void;
};

function SortableListCard({ list, onEdit, onDelete }: SortableListCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

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
      <div
        className={cn(
          "absolute left-3 top-3 z-10 cursor-grab touch-none rounded p-1 text-muted-foreground",
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
          "hover:bg-secondary hover:text-foreground active:cursor-grabbing"
        )}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <ListCard list={list} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

type Props = {
  initialLists: ListWithCount[];
};

export function ListsContent({ initialLists }: Props) {
  const router = useRouter();
  const [lists, setLists] = useState(initialLists);
  const [createOpen, setCreateOpen] = useState(false);
  const [editList, setEditList] = useState<ListWithCount | null>(null);
  const [deleteList, setDeleteList] = useState<ListWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const favorites = lists.find((l) => l.name === "Favorites");
  const sortable = lists.filter((l) => l.name !== "Favorites");

  // Top-level lists available as parent options (exclude Favorites since it's special)
  const topLevelLists = lists
    .filter((l) => l.name !== "Favorites")
    .map((l) => ({ id: l.id, name: l.name }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortable.findIndex((l) => l.id === active.id);
      const newIndex = sortable.findIndex((l) => l.id === over.id);
      const reordered = arrayMove(sortable, oldIndex, newIndex);
      setLists(favorites ? [favorites, ...reordered] : reordered);

      try {
        await fetch("/api/lists/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listIds: reordered.map((l) => l.id) }),
        });
      } catch {
        toast.error("Failed to save list order");
        setLists(initialLists);
      }
    },
    [sortable, favorites, initialLists]
  );

  async function handleConfirmDelete() {
    if (!deleteList) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/lists/${deleteList.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete");
      }
      toast.success("List deleted");
      setDeleteList(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  const showEmpty = sortable.length === 0 && !favorites;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Lists</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New List
        </Button>
      </div>

      {showEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayoutList className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold text-foreground">
            No lists yet
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Create collections to organize your library.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            Create a list
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Favorites always pinned at top, not draggable */}
          {favorites && (
            <ListCard
              list={favorites}
              onEdit={setEditList}
              onDelete={setDeleteList}
            />
          )}

          {/* Remaining lists are drag-sortable */}
          {sortable.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortable.map((l) => l.id)}
                strategy={rectSortingStrategy}
              >
                {sortable.map((list) => (
                  <SortableListCard
                    key={list.id}
                    list={list}
                    onEdit={setEditList}
                    onDelete={setDeleteList}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <CreateListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        topLevelLists={topLevelLists}
      />

      <EditListDialog
        list={editList}
        open={editList !== null}
        onOpenChange={(v) => {
          if (!v) setEditList(null);
        }}
        topLevelLists={topLevelLists}
      />

      <AlertDialog
        open={deleteList !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteList(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteList?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the list but not the items in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
