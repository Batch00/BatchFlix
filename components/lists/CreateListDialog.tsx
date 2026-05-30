"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin } from "lucide-react";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateListDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PRESET_COLORS[0].hex);
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setDescription("");
    setColor(PRESET_COLORS[0].hex);
    setIsPinned(false);
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          isPinned,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create list");
      }
      toast.success("List created");
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New List</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="list-name">Name</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My List"
              maxLength={50}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="list-desc">Description</Label>
            <Textarea
              id="list-desc"
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
                    "h-6 w-6 rounded-full transition-all",
                    c.bg,
                    color === c.hex
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#111111]"
                      : "opacity-70 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="list-pin">Pin to top</Label>
            </div>
            <Switch
              id="list-pin"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
