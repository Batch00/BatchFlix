"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Film, Tv, Pencil, Trash2 } from "lucide-react";
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
import { StarRating } from "./StarRating";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { UserMediaRow } from "@/lib/queries/library";

const STATUS_BADGE: Record<string, string> = {
  watched: "bg-primary/20 text-primary border-primary/30",
  watching: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  watchlist: "bg-secondary text-muted-foreground border-border",
};

type Props = {
  item: UserMediaRow;
  onRemoved: (id: string) => void;
};

export function MediaRow({ item, onRemoved }: Props) {
  const [removing, setRemoving] = useState(false);
  const { media_items: m } = item;
  const year = m.release_date ? new Date(m.release_date).getFullYear() : null;

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/library/remove", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMediaId: item.id }),
      });
      if (!res.ok) throw new Error("Remove failed");
      onRemoved(item.id);
      toast.success("Removed from library");
    } catch {
      toast.error("Could not remove item.");
      setRemoving(false);
    }
  }

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

      <Link
        href={`/media/${m.media_type}/${m.tmdb_id}`}
        className="min-w-0 flex-1"
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
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
            STATUS_BADGE[item.status] ?? STATUS_BADGE.watchlist
          )}
        >
          {item.status}
        </span>

        {item.status === "watched" && item.rating && item.rating > 0 ? (
          <StarRating rating={item.rating} size={14} />
        ) : (
          <div className="w-24" />
        )}

        {item.watched_date ? (
          <span className="w-24 text-right text-xs text-muted-foreground">
            {new Date(item.watched_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ) : (
          <div className="w-24" />
        )}
      </div>

      <div className="flex items-center gap-1">
        <Link
          href={`/media/${m.media_type}/${m.tmdb_id}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>

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
