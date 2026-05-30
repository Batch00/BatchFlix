"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Heart, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { UserMediaRow } from "@/lib/queries/library";

type Status = "watched" | "watching" | "watchlist";

type Props = {
  mediaId: string | null;
  tmdbId: number;
  mediaType: "movie" | "tv";
  initialUserMedia: UserMediaRow | null;
};

const STATUS_LABELS: Record<Status, string> = {
  watchlist: "Watchlist",
  watching: "Watching",
  watched: "Watched",
};

const STATUS_COLORS: Record<Status, string> = {
  watched: "bg-primary/20 text-primary border-primary/30",
  watching: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  watchlist: "bg-secondary text-muted-foreground border-border",
};

export function AddToLibrary({
  tmdbId,
  mediaType,
  initialUserMedia,
}: Props) {
  const router = useRouter();
  const [userMedia, setUserMedia] = useState(initialUserMedia);
  const [panelOpen, setPanelOpen] = useState(false);
  const [status, setStatus] = useState<Status>(
    userMedia?.status ?? "watchlist"
  );
  const [rating, setRating] = useState(userMedia?.rating ?? 0);
  const [watchedDate, setWatchedDate] = useState(
    userMedia?.watched_date ?? ""
  );
  const [notes, setNotes] = useState(userMedia?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  function openPanel() {
    setStatus(userMedia?.status ?? "watchlist");
    setRating(userMedia?.rating ?? 0);
    setWatchedDate(userMedia?.watched_date ?? "");
    setNotes(userMedia?.notes ?? "");
    setPanelOpen(true);
  }

  function handleStatusChange(s: Status) {
    setStatus(s);
    if (s === "watched" && !watchedDate) {
      setWatchedDate(new Date().toISOString().slice(0, 10));
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (userMedia) {
        const res = await fetch("/api/library/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMediaId: userMedia.id,
            status,
            rating: rating > 0 ? rating : null,
            watchedDate: watchedDate || null,
            notes: notes || null,
          }),
        });
        if (!res.ok) throw new Error("Update failed");
        const updated = await res.json();
        setUserMedia({ ...userMedia, ...updated });
        toast.success("Updated");
      } else {
        const res = await fetch("/api/library/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId,
            mediaType,
            status,
            rating: rating > 0 ? rating : undefined,
            watchedDate: watchedDate || undefined,
            notes: notes || undefined,
          }),
        });
        if (!res.ok) throw new Error("Add failed");
        const created = await res.json();
        setUserMedia({ ...created, media_items: null } as UserMediaRow);
        router.refresh();
        toast.success("Added to library");
      }
      setPanelOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite() {
    if (!userMedia) return;
    setToggling(true);
    const newFav = !userMedia.is_favorite;
    try {
      const res = await fetch("/api/library/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMediaId: userMedia.id,
          isFavorite: newFav,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      setUserMedia({ ...userMedia, is_favorite: newFav });

      // Sync with Favorites list
      const listsRes = await fetch("/api/lists");
      if (listsRes.ok) {
        const lists = await listsRes.json();
        const favList = (lists as Array<{ id: string; name: string }>).find(
          (l) => l.name === "Favorites"
        );
        if (favList && userMedia.media_id) {
          if (newFav) {
            await fetch(`/api/lists/${favList.id}/items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mediaId: userMedia.media_id }),
            });
          } else {
            await fetch(`/api/lists/${favList.id}/items`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mediaId: userMedia.media_id }),
            });
          }
        }
      }
      toast.success(newFav ? "Added to Favorites" : "Removed from Favorites");
    } catch {
      toast.error("Could not update favorite.");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {userMedia && !panelOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
              STATUS_COLORS[userMedia.status]
            )}
          >
            {STATUS_LABELS[userMedia.status]}
          </span>
          {userMedia.rating && userMedia.rating > 0 && (
            <StarRating rating={userMedia.rating} size={14} />
          )}
          <button
            type="button"
            onClick={openPanel}
            className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            aria-label="Edit library entry"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={toggling}
            className="rounded-md p-1.5 transition-colors duration-150 hover:bg-secondary"
            aria-label={
              userMedia.is_favorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Heart
              className={cn(
                "h-4 w-4",
                userMedia.is_favorite
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground"
              )}
            />
          </button>
        </div>
      )}

      {!userMedia && !panelOpen && (
        <Button onClick={openPanel} className="w-full sm:w-auto">
          Add to Library
        </Button>
      )}

      {panelOpen && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {userMedia ? "Edit entry" : "Add to library"}
            </span>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2">
            {(["watchlist", "watching", "watched"] as Status[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                  status === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <StarRating
            interactive
            rating={rating}
            onChange={setRating}
            size={24}
          />

          {status === "watched" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">
                Watched date
              </label>
              <input
                type="date"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
                className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          )}

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="resize-none text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPanelOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
