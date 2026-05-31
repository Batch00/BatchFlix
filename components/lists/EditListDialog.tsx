"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pin, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ListRule } from "@/lib/queries/lists";

type EditableList = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_pinned: boolean;
  rules: ListRule[];
  parent_list_id: string | null;
};

const PRESET_COLORS = [
  { hex: "#2563EB", bg: "bg-blue-600" },
  { hex: "#7c3aed", bg: "bg-violet-600" },
  { hex: "#db2777", bg: "bg-pink-600" },
  { hex: "#dc2626", bg: "bg-red-600" },
  { hex: "#ea580c", bg: "bg-orange-600" },
  { hex: "#ca8a04", bg: "bg-yellow-600" },
  { hex: "#16a34a", bg: "bg-green-600" },
  { hex: "#0891b2", bg: "bg-cyan-600" },
] as const;

type Props = {
  list: EditableList | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topLevelLists?: Array<{ id: string; name: string }>;
  successMessage?: string;
};

export function EditListDialog({
  list,
  open,
  onOpenChange,
  topLevelLists,
  successMessage,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PRESET_COLORS[0].hex);
  const [isPinned, setIsPinned] = useState(false);
  const [autoRemoveWatched, setAutoRemoveWatched] = useState(false);
  const [parentListId, setParentListId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!list) return;
    const id = setTimeout(() => {
      setName(list.name);
      setDescription(list.description ?? "");
      setColor(list.color);
      setIsPinned(list.is_pinned);
      setParentListId(list.parent_list_id ?? "");
      setAutoRemoveWatched(
        (list.rules ?? []).some(
          (r) => r.type === "auto_remove_on_status" && r.status === "watched"
        )
      );
    }, 0);
    return () => clearTimeout(id);
  }, [list]);

  async function handleSave() {
    if (!list || !name.trim()) return;
    setSaving(true);
    try {
      const rules = autoRemoveWatched
        ? [{ type: "auto_remove_on_status", status: "watched" }]
        : [];
      const res = await fetch(`/api/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          isPinned,
          rules,
          parentListId: parentListId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update list");
      }
      toast.success(successMessage ?? "List updated");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  // Exclude the current list from parent options (can't be own parent)
  const parentOptions = (topLevelLists ?? []).filter(
    (l) => l.id !== list?.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-list-name">Name</Label>
            <Input
              id="edit-list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-list-desc">Description</Label>
            <Textarea
              id="edit-list-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  aria-label={c.hex}
                  className={cn(
                    "h-6 w-6 rounded-full transition-all duration-150",
                    c.bg,
                    color === c.hex
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#111111]"
                      : "opacity-70 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>

          {parentOptions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-list-parent">
                Nest under list (optional)
              </Label>
              <select
                id="edit-list-parent"
                value={parentListId}
                onChange={(e) => setParentListId(e.target.value)}
                className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">None (top-level list)</option>
                {parentOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!parentListId && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="edit-list-pin">Pin to top</Label>
              </div>
              <Switch
                id="edit-list-pin"
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-list-auto-remove" className="font-medium">
                Auto-remove when watched
              </Label>
              <Switch
                id="edit-list-auto-remove"
                checked={autoRemoveWatched}
                onCheckedChange={setAutoRemoveWatched}
              />
            </div>
            {autoRemoveWatched && (
              <p className="text-xs text-muted-foreground">
                Items in this list will be removed automatically when you mark
                them as watched.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
