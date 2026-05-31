"use client";

import Link from "next/link";
import { Pin, Pencil, Trash2, Heart, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListWithCount } from "@/lib/queries/lists";

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

const COLOR_DOT: Record<string, string> = {
  "#2563EB": "bg-blue-600",
  "#7c3aed": "bg-violet-600",
  "#db2777": "bg-pink-600",
  "#dc2626": "bg-red-600",
  "#ea580c": "bg-orange-600",
  "#ca8a04": "bg-yellow-600",
  "#16a34a": "bg-green-600",
  "#0891b2": "bg-cyan-600",
};

function ColorDot({ color, size = "md" }: { color: string; size?: "sm" | "md" }) {
  const cls = COLOR_BG[color] ?? "bg-blue-600";
  return (
    <span
      className={cn(
        "flex-shrink-0 rounded-full",
        size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
        cls
      )}
    />
  );
}

type Props = {
  list: ListWithCount;
  onEdit: (list: ListWithCount) => void;
  onDelete: (list: ListWithCount) => void;
};

export function ListCard({ list, onEdit, onDelete }: Props) {
  const isFavorites = list.name === "Favorites";
  const sublistCount = list.sublists?.length ?? 0;

  return (
    <div className="relative">
      <Link
        href={`/lists/${list.id}`}
        className="block rounded-xl border border-[#1f1f1f] bg-[#111111] p-5 transition-colors hover:border-[#2563EB]/40"
      >
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isFavorites ? (
              <Heart className="h-4 w-4 flex-shrink-0 fill-red-500 text-red-500" />
            ) : (
              <ColorDot color={list.color} />
            )}
            <span className="truncate font-semibold text-foreground">
              {list.name}
            </span>
            {list.is_pinned && (
              <Pin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )}
          </div>
        </div>

        {list.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {list.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {list.item_count} {list.item_count === 1 ? "item" : "items"}
          </span>
          {sublistCount > 0 && (
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {sublistCount} {sublistCount === 1 ? "sublist" : "sublists"}
            </span>
          )}
        </div>
      </Link>

      <div className="absolute bottom-4 right-4 flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onEdit(list);
          }}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Edit list"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {!isFavorites && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onDelete(list);
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
            aria-label="Delete list"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

    </div>
  );
}
