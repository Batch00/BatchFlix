"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AddToLibrary({
  tmdbId,
  mediaType,
  initialUserMedia,
}: Props) {
  const router = useRouter();
  const [userMedia, setUserMedia] = useState(initialUserMedia);

  // --- State for items NOT in library (add panel) ---
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [addStatus, setAddStatus] = useState<Status>("watchlist");
  const [addRating, setAddRating] = useState(0);
  const [addWatchedDate, setAddWatchedDate] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // --- State for items IN library (pill + contextual panel) ---
  const [activeStatus, setActiveStatus] = useState<Status>(
    initialUserMedia?.status ?? "watchlist"
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [rating, setRating] = useState(initialUserMedia?.rating ?? 0);
  const [watchedDate, setWatchedDate] = useState(
    initialUserMedia?.watched_date ?? ""
  );
  const [notes, setNotes] = useState(initialUserMedia?.notes ?? "");
  const [createdAt, setCreatedAt] = useState(
    initialUserMedia?.created_at?.slice(0, 10) ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Pill click: if same status, toggle panel; if different, save status + open panel
  async function handlePillClick(newStatus: Status) {
    if (newStatus === activeStatus) {
      setPanelOpen((prev) => !prev);
      return;
    }

    // Prep panel data for incoming status
    if (newStatus === "watched" && !watchedDate) {
      setWatchedDate(today());
    }
    // Clear rating when leaving "watched"
    if (newStatus !== "watched") setRating(0);

    setPanelOpen(true);

    // Optimistic status update
    const prevStatus = activeStatus;
    setActiveStatus(newStatus);
    setStatusSaving(true);

    try {
      const res = await fetch("/api/library/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMediaId: userMedia!.id,
          status: newStatus,
          // Clear rating on DB side if moving away from watched
          ...(newStatus !== "watched" ? { rating: null } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setUserMedia((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success(`Marked as ${STATUS_LABELS[newStatus]}`);
    } catch {
      setActiveStatus(prevStatus);
      toast.error("Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  // Save additional fields (rating, date, notes) for the current status
  async function handleSave() {
    if (!userMedia) return;
    setSaving(true);
    try {
      const res = await fetch("/api/library/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMediaId: userMedia.id,
          rating:
            activeStatus === "watched" && rating > 0 ? rating : null,
          watchedDate:
            activeStatus !== "watchlist" && watchedDate ? watchedDate : null,
          notes: notes || null,
          ...(activeStatus === "watchlist" && createdAt
            ? { createdAt }
            : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setUserMedia((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success("Saved");
      setPanelOpen(false);
    } catch {
      toast.error("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  // Add to library (for items not yet in library)
  async function handleAddToLibrary() {
    setAddSaving(true);
    try {
      const res = await fetch("/api/library/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          mediaType,
          status: addStatus,
          rating:
            addStatus === "watched" && addRating > 0 ? addRating : undefined,
          watchedDate:
            addStatus !== "watchlist" && addWatchedDate
              ? addWatchedDate
              : undefined,
          notes: addNotes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Add failed");
      const created = await res.json();
      setUserMedia({ ...created, media_items: null } as UserMediaRow);
      setActiveStatus(addStatus);
      setRating(addStatus === "watched" ? addRating : 0);
      setWatchedDate(addWatchedDate);
      setNotes(addNotes);
      setAddPanelOpen(false);
      router.refresh();
      toast.success("Added to library");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAddSaving(false);
    }
  }

  async function toggleFavorite() {
    if (!userMedia) return;
    setToggling(true);
    const newFav = !userMedia.is_favorite;
    const listName =
      mediaType === "movie" ? "Favorite Movies" : "Favorite TV Shows";

    try {
      const res = await fetch("/api/library/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMediaId: userMedia.id,
          isFavorite: newFav,
        }),
      });
      if (!res.ok) throw new Error();
      setUserMedia((prev) =>
        prev ? { ...prev, is_favorite: newFav } : prev
      );

      // Sync with the correct favorites list
      const listsRes = await fetch("/api/lists");
      if (listsRes.ok) {
        const lists = await listsRes.json();
        const favList = (
          lists as Array<{ id: string; name: string }>
        ).find((l) => l.name === listName);
        if (favList && userMedia.media_id) {
          await fetch(`/api/lists/${favList.id}/items`, {
            method: newFav ? "POST" : "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaId: userMedia.media_id }),
          });
        }
      }
      toast.success(
        newFav ? `Added to ${listName}` : `Removed from ${listName}`
      );
    } catch {
      toast.error("Could not update favorite.");
    } finally {
      setToggling(false);
    }
  }

  // ---- NOT in library ----
  if (!userMedia) {
    if (!addPanelOpen) {
      return (
        <Button
          onClick={() => setAddPanelOpen(true)}
          className="w-full sm:w-auto"
        >
          Add to Library
        </Button>
      );
    }

    return (
      <div className="flex w-full flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <span className="text-sm font-medium text-foreground">
          Add to library
        </span>

        <div className="flex gap-2">
          {(["watchlist", "watching", "watched"] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setAddStatus(s);
                if (s === "watched" && !addWatchedDate) setAddWatchedDate(today());
                if (s !== "watched") setAddRating(0);
              }}
              className={cn(
                "flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                addStatus === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {addStatus === "watched" && (
          <StarRating
            interactive
            rating={addRating}
            onChange={setAddRating}
            size={24}
          />
        )}

        {addStatus !== "watchlist" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">
              {addStatus === "watched" ? "Watch date" : "Date started"}
            </label>
            <input
              type="date"
              value={addWatchedDate}
              onChange={(e) => setAddWatchedDate(e.target.value)}
              className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        )}

        <Textarea
          value={addNotes}
          onChange={(e) => setAddNotes(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          className="resize-none text-sm"
        />

        <div className="flex gap-2">
          <Button
            onClick={handleAddToLibrary}
            disabled={addSaving}
            className="flex-1"
          >
            {addSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAddPanelOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ---- IN library ----
  return (
    <div className="flex w-full flex-col gap-3">
      {/* Status pills + heart */}
      <div className="flex flex-wrap items-center gap-2">
        {(["watchlist", "watching", "watched"] as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handlePillClick(s)}
            disabled={statusSaving}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              activeStatus === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}

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

      {/* Contextual panel */}
      {panelOpen && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          {activeStatus === "watched" && (
            <StarRating
              interactive
              rating={rating}
              onChange={setRating}
              size={24}
            />
          )}

          {activeStatus === "watched" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">
                Watch date
              </label>
              <input
                type="date"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
                className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          )}

          {activeStatus === "watching" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">
                Date started
              </label>
              <input
                type="date"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
                className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          )}

          {activeStatus === "watchlist" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">
                Date Added
              </label>
              <input
                type="date"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground/60">
                When you added this to your watchlist.
              </p>
            </div>
          )}

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="resize-none text-sm"
          />

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
