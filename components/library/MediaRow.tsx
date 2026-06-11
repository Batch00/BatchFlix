"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Film, Tv, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StarRating } from "./StarRating";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { UserMediaRow } from "@/lib/queries/library";

type Status = "watched" | "watching" | "watchlist";

const STATUS_BADGE: Record<Status, string> = {
  watched: "bg-primary/20 text-primary border-primary/30",
  watching: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  watchlist: "bg-secondary text-muted-foreground border-border",
};

const STATUS_LABELS: Record<Status, string> = {
  watched: "Watched",
  watching: "Watching",
  watchlist: "Watchlist",
};

const STATUS_MOBILE_BADGE: Record<Status, string> = {
  watched: "bg-blue-900/80 text-blue-200",
  watching: "bg-yellow-900/80 text-yellow-200",
  watchlist: "bg-zinc-800/80 text-zinc-300",
};

type Props = {
  item: UserMediaRow;
  onRemoved: (id: string) => void;
};

export function MediaRow({ item, onRemoved }: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [statusPopover, setStatusPopover] = useState(false);
  const [editingRating, setEditingRating] = useState(false);
  const [editingDate, setEditingDate] = useState(false);

  const [rowStatus, setRowStatus] = useState<Status>(item.status);
  const [rowRating, setRowRating] = useState(item.rating ?? 0);
  const [rowDate, setRowDate] = useState(item.watched_date ?? "");

  const dateInputRef = useRef<HTMLInputElement>(null);
  const ratingWrapRef = useRef<HTMLDivElement>(null);

  const { media_items: m } = item;
  const year = m.release_date ? +m.release_date.slice(0, 4) : null;

  function formatDate(d: string) {
    const [yr, mo, dy] = d.split("T")[0].split("-");
    return new Date(+yr, +mo - 1, +dy).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async function updateField(fields: Record<string, unknown>) {
    const res = await fetch("/api/library/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMediaId: item.id, ...fields }),
    });
    if (!res.ok) throw new Error("Update failed");
  }

  async function handleStatusChange(newStatus: Status) {
    setStatusPopover(false);
    if (newStatus === rowStatus) return;
    const prev = rowStatus;
    setRowStatus(newStatus);
    try {
      await updateField({ status: newStatus });
      toast.success("Status updated");
    } catch {
      setRowStatus(prev);
      toast.error("Update failed");
    }
  }

  async function saveRating(newRating: number) {
    setEditingRating(false);
    if (newRating === rowRating) return;
    const prev = rowRating;
    setRowRating(newRating);
    try {
      await updateField({ rating: newRating > 0 ? newRating : null });
      toast.success("Rating saved");
    } catch {
      setRowRating(prev);
      toast.error("Save failed");
    }
  }

  async function saveDate(newDate: string) {
    setEditingDate(false);
    if (newDate === rowDate) return;
    const prev = rowDate;
    setRowDate(newDate);
    try {
      await updateField({ watchedDate: newDate || null });
      toast.success("Date updated");
    } catch {
      setRowDate(prev);
      toast.error("Save failed");
    }
  }

  async function handleRemove() {
    setRemoving(true);
    const snapshot = {
      tmdbId: m.tmdb_id,
      mediaType: m.media_type,
      status: rowStatus,
      ...(rowRating > 0 ? { rating: rowRating } : {}),
      ...(rowDate ? { watchedDate: rowDate } : {}),
    };
    try {
      const res = await fetch("/api/library/remove", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMediaId: item.id }),
      });
      if (!res.ok) throw new Error("Remove failed");
      onRemoved(item.id);
      toast("Removed from library", {
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              try {
                await fetch("/api/library/add", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(snapshot),
                });
                toast.success("Undone");
                router.refresh();
              } catch {
                toast.error("Failed to undo");
              }
            })();
          },
        },
      });
    } catch {
      toast.error("Could not remove item.");
      setRemoving(false);
    }
  }

  const watched = item.watchedEpisodes ?? 0;
  const total = m.total_episodes ?? 0;
  const showProgress = m.media_type === "tv" && watched > 0 && watched < total;
  const pct = total > 0 ? (watched / total) * 100 : 0;
  const hasNewContent = m.media_type === "tv" && rowStatus === "watched" && watched > 0 && total > watched;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-card/80 md:items-center">
      <Link
        href={`/media/${m.media_type}/${m.tmdb_id}`}
        className="relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded"
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

      {/* Mobile two-line content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:hidden">
        <div className="flex items-start justify-between gap-1">
          <Link href={`/media/${m.media_type}/${m.tmdb_id}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                aria-label="Remove"
                disabled={removing}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from library?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{m.title}&rdquo; will be removed from your library.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {year && <span className="text-xs text-muted-foreground">{year}</span>}
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
            {m.media_type}
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              STATUS_MOBILE_BADGE[rowStatus] ?? STATUS_MOBILE_BADGE.watchlist
            )}
          >
            {STATUS_LABELS[rowStatus]}
          </span>
          {hasNewContent && (
            <span className="rounded-full border border-yellow-700/40 bg-yellow-900/60 px-1.5 py-0.5 text-[10px] text-yellow-300">
              New Season
            </span>
          )}
        </div>

        {(rowRating > 0 || rowDate) && (
          <div className="flex items-center gap-2">
            {rowRating > 0 && <StarRating rating={rowRating} size={12} />}
            {rowDate && (
              <span className="text-xs text-muted-foreground">{formatDate(rowDate)}</span>
            )}
          </div>
        )}

        {showProgress && (
          <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Desktop single-row content */}
      <Link href={`/media/${m.media_type}/${m.tmdb_id}`} className="hidden min-w-0 flex-1 md:block">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
          {hasNewContent && (
            <span className="flex-shrink-0 rounded-full border border-yellow-700/40 bg-yellow-900/60 px-1.5 py-0.5 text-[10px] text-yellow-300">
              New Season
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {year && <span className="text-xs text-muted-foreground">{year}</span>}
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
            {m.media_type}
          </span>
        </div>
        {showProgress && (
          <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${pct}%` }} />
          </div>
        )}
      </Link>

      <div className="hidden items-center gap-3 md:flex">
        {/* Status badge -- click to change */}
        <Popover open={statusPopover} onOpenChange={setStatusPopover}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors",
                STATUS_BADGE[rowStatus] ?? STATUS_BADGE.watchlist,
                "hover:opacity-80 cursor-pointer"
              )}
            >
              {STATUS_LABELS[rowStatus]}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2">
            <div className="flex flex-col gap-1">
              {(["watchlist", "watching", "watched"] as Status[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium text-left transition-colors",
                    rowStatus === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Rating -- double-click to edit */}
        {rowStatus === "watched" ? (
          editingRating ? (
            <div
              ref={ratingWrapRef}
              tabIndex={-1}
              onBlur={(e) => {
                if (!ratingWrapRef.current?.contains(e.relatedTarget as Node)) {
                  saveRating(rowRating);
                }
              }}
              className="flex items-center gap-1 outline-none"
            >
              <StarRating
                interactive
                rating={rowRating}
                onChange={(val) => {
                  setRowRating(val);
                  saveRating(val);
                }}
                size={14}
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveRating(0);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear rating"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onDoubleClick={() => setEditingRating(true)}
              title="Double-click to edit rating"
              className="w-24 text-left outline-none"
            >
              {rowRating > 0 ? (
                <StarRating rating={rowRating} size={14} />
              ) : (
                <span className="text-xs text-muted-foreground/40 hover:text-muted-foreground">
                  No rating
                </span>
              )}
            </button>
          )
        ) : (
          <div className="w-24" />
        )}

        {/* Date -- double-click to edit */}
        {editingDate ? (
          <input
            ref={dateInputRef}
            type="date"
            defaultValue={rowDate}
            onBlur={(e) => saveDate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveDate((e.target as HTMLInputElement).value);
              if (e.key === "Escape") setEditingDate(false);
            }}
            autoFocus
            className="w-28 rounded border border-border bg-secondary px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-primary"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setEditingDate(true)}
            title="Double-click to edit date"
            className="w-24 text-right outline-none"
          >
            {rowDate ? (
              <span className="text-xs text-muted-foreground">
                {formatDate(rowDate)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground/40 hover:text-muted-foreground">
                No date
              </span>
            )}
          </button>
        )}
      </div>

      <div className="hidden items-center gap-1 md:flex">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
              aria-label="Remove"
              disabled={removing}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from library?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{m.title}&rdquo; will be removed from your library. This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
