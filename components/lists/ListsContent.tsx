"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LayoutList } from "lucide-react";
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
import type { ListWithCount } from "@/lib/queries/lists";

type Props = {
  initialLists: ListWithCount[];
};

export function ListsContent({ initialLists }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editList, setEditList] = useState<ListWithCount | null>(null);
  const [deleteList, setDeleteList] = useState<ListWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const nonFavorites = initialLists.filter((l) => l.name !== "Favorites");
  const showEmpty = nonFavorites.length === 0;

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
          {initialLists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onEdit={setEditList}
              onDelete={setDeleteList}
            />
          ))}
        </div>
      )}

      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditListDialog
        list={editList}
        open={editList !== null}
        onOpenChange={(v) => {
          if (!v) setEditList(null);
        }}
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
